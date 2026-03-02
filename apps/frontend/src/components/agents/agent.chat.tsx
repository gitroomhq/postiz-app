'use client';

import React, {
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import clsx from 'clsx';
import useSWR from 'swr';
import {
  CopilotChat,
  CopilotKitCSSProperties,
  InputProps,
  UserMessageProps,
} from '@copilotkit/react-ui';
import { Input } from '@gitroom/frontend/components/agents/agent.input';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  CopilotKit,
  useCopilotAction,
  useCopilotMessagesContext,
} from '@copilotkit/react-core';
import {
  MediaPortal,
  PropertiesContext,
} from '@gitroom/frontend/components/agents/agent';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { TextMessage } from '@copilotkit/runtime-client-gql';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type AiOption = 'openai' | 'lmstudio' | 'llamacpp' | 'other';

const AI_OPTIONS: {
  id: AiOption;
  label: string;
  description: string;
  defaultApiKey: string;
  defaultBaseUrl: string;
  defaultModel: string;
  tomlBlock: string;
  envBlock: string;
}[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Cloud AI from OpenAI. Get an API key at platform.openai.com.',
    defaultApiKey: '',
    defaultBaseUrl: '',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "sk-proj-your-key-here"',
    envBlock: 'OPENAI_API_KEY=sk-proj-your-key-here',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    description: 'Free, runs locally. Download at lmstudio.ai, load a model, then start the local server.',
    defaultApiKey: 'local',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "local"\nbase_url = "http://localhost:1234/v1"\nchat_model = "your-loaded-model-name"',
    envBlock: 'OPENAI_API_KEY=local\nOPENAI_BASE_URL=http://localhost:1234/v1\nOPENAI_CHAT_MODEL=your-loaded-model-name',
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp',
    description: 'Free, runs locally. Build llama.cpp and run llama-server with your model file.',
    defaultApiKey: 'local',
    defaultBaseUrl: 'http://localhost:8080/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "local"\nbase_url = "http://localhost:8080/v1"\nchat_model = "your-model-name"',
    envBlock: 'OPENAI_API_KEY=local\nOPENAI_BASE_URL=http://localhost:8080/v1\nOPENAI_CHAT_MODEL=your-model-name',
  },
  {
    id: 'other',
    label: 'z.ai / other',
    description: 'Any OpenAI-compatible API — z.ai, Together AI, Groq, Ollama, Mistral, or self-hosted.',
    defaultApiKey: '',
    defaultBaseUrl: '',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "your-api-key"\nbase_url = "https://your-api-endpoint/v1"\nchat_model = "model-name"',
    envBlock: 'OPENAI_API_KEY=your-api-key\nOPENAI_BASE_URL=https://your-api-endpoint/v1\nOPENAI_CHAT_MODEL=model-name',
  },
];

const AiSetupGuide: FC<{ onConfigured: () => void }> = ({ onConfigured }) => {
  const { desktopMode } = useVariables();
  const fetch = useFetch();
  const [activeOption, setActiveOption] = useState<AiOption>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState('');

  const option = AI_OPTIONS.find((o) => o.id === activeOption)!;

  // Pre-fill defaults when switching provider tabs
  useEffect(() => {
    const opt = AI_OPTIONS.find((o) => o.id === activeOption)!;
    setApiKey(opt.defaultApiKey);
    setBaseUrl(opt.defaultBaseUrl);
    setChatModel(opt.defaultModel);
    setError('');
  }, [activeOption]);

  const copy = useCallback((key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }, []);

  const connect = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const res = await fetch('/copilot/configure', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
          chatModel: chatModel.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.configured) {
        onConfigured();
      } else {
        setError('Configuration failed — API key may be invalid');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to connect');
    }
    setConnecting(false);
  }, [apiKey, baseUrl, chatModel, fetch, onConfigured]);

  const inputClasses =
    'w-full bg-newBgColor text-newTextColor border border-blockSeparator rounded-[8px] px-[12px] py-[10px] text-[13px] font-mono placeholder:text-textItemBlur focus:outline-none focus:border-btnPrimary';

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-[32px] overflow-auto">
      <div className="max-w-[560px] w-full flex flex-col gap-[24px]">
        <div className="flex flex-col gap-[8px]">
          <div className="text-[20px] font-[600] text-newTextColor">Configure AI</div>
          <div className="text-[14px] text-textItemBlur">
            Connect an AI provider to enable the Postiz agent. Settings are applied instantly.
          </div>
        </div>

        <div className="flex gap-[8px] flex-wrap">
          {AI_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveOption(opt.id)}
              className={clsx(
                'px-[16px] py-[8px] rounded-[8px] text-[14px] font-[500] border transition-colors',
                activeOption === opt.id
                  ? 'bg-btnPrimary text-btnText border-transparent'
                  : 'bg-transparent text-textItemBlur border-blockSeparator hover:text-newTextColor'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="text-[13px] text-textItemBlur">{option.description}</div>

        <div className="flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[4px]">
            <label className="text-[13px] font-[500] text-newTextColor">API Key</label>
            <input
              type="password"
              className={inputClasses}
              placeholder={activeOption === 'openai' ? 'sk-proj-...' : 'local'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[13px] font-[500] text-newTextColor">
              Base URL <span className="font-[400] text-textItemBlur">(optional for OpenAI)</span>
            </label>
            <input
              type="text"
              className={inputClasses}
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[13px] font-[500] text-newTextColor">
              Model <span className="font-[400] text-textItemBlur">(optional, defaults to gpt-4.1)</span>
            </label>
            <input
              type="text"
              className={inputClasses}
              placeholder="gpt-4.1"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="text-[13px] text-red-400 bg-red-400/10 rounded-[8px] px-[12px] py-[8px]">
            {error}
          </div>
        )}

        <button
          onClick={connect}
          disabled={connecting}
          className={clsx(
            'px-[24px] py-[12px] rounded-[8px] text-[14px] font-[600] transition-opacity',
            connecting ? 'bg-btnPrimary/50 text-btnText cursor-wait' : 'bg-btnPrimary text-btnText hover:opacity-90'
          )}
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>

        {/* Manual config reference for advanced users */}
        <details className="text-left">
          <summary className="text-[12px] text-textItemBlur cursor-pointer select-none">
            Manual configuration (config file)
          </summary>
          <div className="mt-[12px] flex flex-col gap-[8px]">
            {desktopMode ? (
              <>
                <div className="text-[12px] text-textItemBlur font-mono bg-newBgColor rounded-[6px] px-[10px] py-[6px]">
                  ~/Library/Application Support/Postiz/config.toml
                </div>
                <div className="bg-newBgColor rounded-[8px] p-[16px] font-mono text-[13px] relative">
                  <pre className="whitespace-pre-wrap text-newTextColor pr-[60px]">{option.tomlBlock}</pre>
                  <button
                    onClick={() => copy('toml', option.tomlBlock)}
                    className="absolute top-[8px] right-[8px] px-[10px] py-[6px] bg-btnSimple text-btnText rounded-[6px] text-[12px]"
                  >
                    {copied === 'toml' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-[12px] text-textItemBlur">Add to your .env file:</div>
                <div className="bg-newBgColor rounded-[8px] p-[16px] font-mono text-[13px] relative">
                  <pre className="whitespace-pre-wrap text-newTextColor pr-[60px]">{option.envBlock}</pre>
                  <button
                    onClick={() => copy('env', option.envBlock)}
                    className="absolute top-[8px] right-[8px] px-[10px] py-[6px] bg-btnSimple text-btnText rounded-[6px] text-[12px]"
                  >
                    {copied === 'env' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

class CopilotErrorBoundary extends React.Component<
  { children: React.ReactNode; desktopMode: boolean },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 p-[32px]">
          <div className="max-w-[480px] w-full flex flex-col gap-[16px] text-center">
            <div className="text-[18px] font-[600] text-newTextColor">Could not connect to AI</div>
            <div className="text-[14px] text-textItemBlur">
              {this.props.desktopMode
                ? 'Check your AI settings in ~/Library/Application Support/Postiz/config.toml or postiz.env and restart the app.'
                : 'Check OPENAI_API_KEY and OPENAI_BASE_URL in your server .env and restart.'}
            </div>
            <details className="w-full text-left">
              <summary className="text-[12px] text-textItemBlur cursor-pointer select-none">Technical details</summary>
              <div className="text-[12px] text-textItemBlur font-mono bg-newBgColor rounded-[8px] p-[12px] mt-[8px] break-all">
                {this.state.error.message}
              </div>
            </details>
            <button
              className="mt-[8px] px-[24px] py-[10px] bg-btnPrimary text-btnText rounded-[8px] text-[14px] font-[600] hover:opacity-90"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AgentChat: FC = () => {
  const { backendUrl, desktopMode } = useVariables();
  const params = useParams<{ id: string }>();
  const { properties } = useContext(PropertiesContext);
  const fetch = useFetch();
  const t = useT();

  const loadStatus = useCallback(async () => {
    return (await fetch('/copilot/status')).json();
  }, [fetch]);

  const { data: status, isLoading: statusLoading, mutate: mutateStatus } = useSWR('/copilot/status', loadStatus, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  if (statusLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[14px] text-textItemBlur">
        Checking AI configuration...
      </div>
    );
  }

  // Only show guide if we got a definitive "not configured" response.
  // If status is undefined (fetch error/401), fall through to CopilotKit —
  // the ErrorBoundary catches runtime failures.
  if (status && !status.configured) {
    return <AiSetupGuide onConfigured={() => mutateStatus()} />;
  }

  return (
    <CopilotErrorBoundary desktopMode={desktopMode}>
      <CopilotKit
        {...(params.id === 'new' ? {} : { threadId: params.id })}
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/agent'}
        showDevConsole={false}
        agent="postiz"
        properties={{
          integrations: properties,
        }}
      >
        <Hooks />
        <LoadMessages id={params.id} />
        <div
          style={
            {
              '--copilot-kit-primary-color': 'var(--new-btn-text)',
              '--copilot-kit-background-color': 'var(--new-bg-color)',
            } as CopilotKitCSSProperties
          }
          className="trz agent bg-newBgColorInner flex flex-col gap-[15px] transition-all flex-1 items-center relative"
        >
          <div className="absolute left-0 w-full h-full pb-[20px]">
            <CopilotChat
              className="w-full h-full"
              labels={{
                title: t('your_assistant', 'Your Assistant'),
                initial: t('agent_welcome_message', `Hello, I am your Postiz agent 🙌🏻.

I can schedule a post or multiple posts to multiple channels and generate pictures and videos.

You can select the channels you want to use from the left menu.

You can see your previous conversations from the right menu.

You can also use me as an MCP Server, check Settings >> Public API
`),
              }}
              UserMessage={Message}
              Input={NewInput}
            />
          </div>
        </div>
      </CopilotKit>
    </CopilotErrorBoundary>
  );
};

const LoadMessages: FC<{ id: string }> = ({ id }) => {
  const { setMessages } = useCopilotMessagesContext();
  const fetch = useFetch();

  const loadMessages = useCallback(async (idToSet: string) => {
    const data = await (await fetch(`/copilot/${idToSet}/list`)).json();
    setMessages(
      data.uiMessages.map((p: any) => {
        return new TextMessage({
          content: p.content,
          role: p.role,
        });
      })
    );
  }, []);

  useEffect(() => {
    if (id === 'new') {
      setMessages([]);
      return;
    }
    loadMessages(id);
  }, [id]);

  return null;
};

const Message: FC<UserMessageProps> = (props) => {
  const convertContentToImagesAndVideo = useMemo(() => {
    return (props.message?.content || '')
      .replace(/Video: (http.*mp4\n)/g, (match, p1) => {
        return `<video controls class="h-[150px] w-[150px] rounded-[8px] mb-[10px]"><source src="${p1.trim()}" type="video/mp4">Your browser does not support the video tag.</video>`;
      })
      .replace(/Image: (http.*\n)/g, (match, p1) => {
        return `<img src="${p1.trim()}" class="h-[150px] w-[150px] max-w-full border border-newBgColorInner" />`;
      })
      .replace(/\[\-\-Media\-\-\](.*)\[\-\-Media\-\-\]/g, (match, p1) => {
        return `<div class="flex justify-center mt-[20px]">${p1}</div>`;
      })
      .replace(
        /(\[--integrations--\][\s\S]*?\[--integrations--\])/g,
        (match, p1) => {
          return ``;
        }
      );
  }, [props.message?.content]);
  return (
    <div
      className="copilotKitMessage copilotKitUserMessage min-w-[300px]"
      dangerouslySetInnerHTML={{ __html: convertContentToImagesAndVideo }}
    />
  );
};
const NewInput: FC<InputProps> = (props) => {
  const [media, setMedia] = useState([] as { path: string; id: string }[]);
  const [value, setValue] = useState('');
  const { properties } = useContext(PropertiesContext);
  return (
    <>
      <MediaPortal
        value={value}
        media={media}
        setMedia={(e) => setMedia(e.target.value)}
      />
      <Input
        {...props}
        onChange={setValue}
        onSend={(text) => {
          const send = props.onSend(
            text +
              (media.length > 0
                ? '\n[--Media--]' +
                  media
                    .map((m) =>
                      m.path.indexOf('mp4') > -1
                        ? `Video: ${m.path}`
                        : `Image: ${m.path}`
                    )
                    .join('\n') +
                  '\n[--Media--]'
                : '') +
              `
${
  properties.length
    ? `[--integrations--]
Use the following social media platforms: ${JSON.stringify(
        properties.map((p) => ({
          id: p.id,
          platform: p.identifier,
          profilePicture: p.picture,
          additionalSettings: p.additionalSettings,
        }))
      )}
[--integrations--]`
    : ``
}`
          );
          setValue('');
          setMedia([]);
          return send;
        }}
      />
    </>
  );
};

export const Hooks: FC = () => {
  const modals = useModals();

  useCopilotAction({
    name: 'manualPosting',
    description:
      'This tool should be triggered when the user wants to manually add the generated post',
    parameters: [
      {
        name: 'list',
        type: 'object[]',
        description:
          'list of posts to schedule to different social media (integration ids)',
        attributes: [
          {
            name: 'integrationId',
            type: 'string',
            description: 'The integration id',
          },
          {
            name: 'date',
            type: 'string',
            description: 'UTC date of the scheduled post',
          },
          {
            name: 'settings',
            type: 'object',
            description: 'Settings for the integration [input:settings]',
          },
          {
            name: 'posts',
            type: 'object[]',
            description: 'list of posts / comments (one under another)',
            attributes: [
              {
                name: 'content',
                type: 'string',
                description: 'the content of the post',
              },
              {
                name: 'attachments',
                type: 'object[]',
                description: 'list of attachments',
                attributes: [
                  {
                    name: 'id',
                    type: 'string',
                    description: 'id of the attachment',
                  },
                  {
                    name: 'path',
                    type: 'string',
                    description: 'url of the attachment',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => {
      if (status === 'executing') {
        return <OpenModal args={args} respond={respond} />;
      }

      return null;
    },
  });
  return null;
};

const OpenModal: FC<{
  respond: (value: any) => void;
  args: {
    list: {
      integrationId: string;
      date: string;
      settings?: Record<string, any>;
      posts: { content: string; attachments: { id: string; path: string }[] }[];
    }[];
  };
}> = ({ args, respond }) => {
  const modals = useModals();
  const { properties } = useContext(PropertiesContext);
  const startModal = useCallback(async () => {
    for (const integration of args.list) {
      await new Promise((res) => {
        const group = makeId(10);
        modals.openModal({
          id: 'add-edit-modal',
          closeOnClickOutside: false,
          removeLayout: true,
          closeOnEscape: false,
          withCloseButton: false,
          askClose: true,
          size: '80%',
          title: ``,
          classNames: {
            modal: 'w-[100%] max-w-[1400px] text-textColor',
          },
          children: (
            <ExistingDataContextProvider
              value={{
                group,
                integration: integration.integrationId,
                integrationPicture:
                  properties.find((p) => p.id === integration.integrationId)
                    .picture || '',
                settings: integration.settings || {},
                posts: integration.posts.map((p) => ({
                  approvedSubmitForOrder: 'NO',
                  content: p.content,
                  createdAt: new Date().toISOString(),
                  state: 'DRAFT',
                  id: makeId(10),
                  settings: JSON.stringify(integration.settings || {}),
                  group,
                  integrationId: integration.integrationId,
                  integration: properties.find(
                    (p) => p.id === integration.integrationId
                  ),
                  publishDate: dayjs.utc(integration.date).toISOString(),
                  image: p.attachments.map((a) => ({
                    id: a.id,
                    path: a.path,
                  })),
                })),
              }}
            >
              <AddEditModal
                date={dayjs.utc(integration.date)}
                allIntegrations={properties}
                integrations={properties.filter(
                  (p) => p.id === integration.integrationId
                )}
                onlyValues={integration.posts.map((p) => ({
                  content: p.content,
                  id: makeId(10),
                  settings: integration.settings || {},
                  image: p.attachments.map((a) => ({
                    id: a.id,
                    path: a.path,
                  })),
                }))}
                reopenModal={() => {}}
                mutate={() => res(true)}
              />
            </ExistingDataContextProvider>
          ),
        });
      });
    }

    respond('User scheduled all the posts');
  }, [args, respond, properties]);

  useEffect(() => {
    startModal();
  }, []);
  return (
    <div onClick={() => respond('continue')}>
      Opening manually ${JSON.stringify(args)}
    </div>
  );
};
