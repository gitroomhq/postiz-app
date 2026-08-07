'use client';

import React, {
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AssistantMessage as CopilotAssistantMessage,
  CopilotChat,
  CopilotKitCSSProperties,
} from '@copilotkit/react-ui';
import {
  AssistantMessageProps,
  InputProps,
  UserMessageProps,
} from '@copilotkit/react-ui/dist/components/chat/props';
import Link from 'next/link';
import { Input } from '@gitroom/frontend/components/agents/agent.input';
import AutoResizingTextarea from '@gitroom/frontend/components/agents/agent.textarea';
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
import {
  Message as CopilotMessage,
  TextMessage,
} from '@copilotkit/runtime-client-gql';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';

type AgentIntegration = Integrations & {
  refreshNeeded?: boolean;
  inBetweenSteps?: boolean;
};

const needsAttention = (
  integration: Pick<AgentIntegration, 'refreshNeeded' | 'inBetweenSteps'>
) => !!(integration.refreshNeeded || integration.inBetweenSteps);

const selectableIntegrations = (
  integrations: AgentIntegration[] | null | undefined
): AgentIntegration[] =>
  Array.isArray(integrations)
    ? integrations.filter((p) => !needsAttention(p))
    : [];

export const AgentChat: FC = () => {
  const { backendUrl, aiEnabled } = useVariables();
  const params = useParams<{ id: string }>();
  const { properties } = useContext(PropertiesContext);
  const t = useT();
  const copilotIntegrations = useMemo(
    () => selectableIntegrations(properties),
    [properties]
  );

  // Without an OpenAI key, do not mount CopilotKit — that remounts against a
  // 503 `/copilot/agent` and brings back the Next CombinedError overlay. Show
  // the same empty chrome as a static shell instead of a blocking takeover.
  if (!aiEnabled) {
    return <UnconfiguredAgentShell />;
  }

  return (
    <CopilotKit
      {...(params.id === 'new' ? {} : { threadId: params.id })}
      credentials="include"
      runtimeUrl={backendUrl + '/copilot/agent'}
      showDevConsole={false}
      agent="postqueen"
      properties={{
        integrations: copilotIntegrations,
      }}
    >
      <Hooks />
      <LoadMessages id={params.id} />
      <div
        style={
          {
            // The SDK is themed through its own custom properties, bound to
            // the token layer where the chat mounts. Background stays
            // transparent so the page's own surfaces show through.
            '--copilot-kit-primary-color': 'var(--brand)',
            '--copilot-kit-contrast-color': 'var(--onBrand)',
            '--copilot-kit-secondary-contrast-color': 'var(--text)',
            '--copilot-kit-background-color': 'transparent',
            '--copilot-kit-input-background-color': 'transparent',
            '--copilot-kit-separator-color': 'var(--line)',
            '--copilot-kit-muted-color': 'var(--muted)',
          } as CopilotKitCSSProperties
        }
        className="trz agent bg-pqInner flex flex-col transition-all flex-1 relative min-w-0"
      >
        <div className="absolute start-0 w-full h-full">
          <CopilotChat
            className="w-full h-full"
            labels={{
              title: t('your_assistant', 'Your Assistant'),
              placeholder: t(
                'agent_placeholder',
                'Ask Copilot to draft, schedule or generate…'
              ),
            }}
            AssistantMessage={AssistantMessage}
            UserMessage={Message}
            Input={NewInput}
          />
        </div>
        <EmptyState />
      </div>
    </CopilotKit>
  );
};

/**
 * Presentational empty-thread hero (title / sub / MCP card). Safe outside
 * CopilotKit — no message-context hooks — so the unconfigured shell can reuse
 * the same LOOK as a live empty thread.
 */
const EmptyStateHero: FC = () => {
  const t = useT();
  return (
    <>
      <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] bg-pqBrandSoft text-pqFocused">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
          <path
            d="M12 3l1.9 4.8 4.8 1.9-4.8 1.9L12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9L12 3ZM18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div>
        <div className="font-display text-[24px] font-[600] tracking-[-0.02em]">
          {t('agent_empty_title', 'What are we posting today?')}
        </div>
        <div className="mx-auto mt-[8px] max-w-[440px] text-[14.5px] leading-[1.6] text-pqMuted">
          {t(
            'agent_empty_sub',
            'Describe the idea. Copilot writes it per channel, makes the images and puts it on your calendar.'
          )}
        </div>
      </div>
      <Link
        href="/connections"
        className="pointer-events-auto flex w-full max-w-[560px] items-center gap-[12px] rounded-[14px] bg-pqPop p-[14px_18px] text-start shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqBrandSoft hover:shadow-[inset_0_0_0_1px_var(--brand)]"
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-pqBrandSoft text-pqFocused">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5ZM4 15.5 12 20l8-4.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[13px] font-[600] text-pqText">
            {t('agent_mcp_card_title', 'Prefer your own AI tool?')}
          </span>
          <span className="text-[12px] leading-[1.45] text-pqMuted">
            {t(
              'agent_mcp_card_sub',
              'Drive PostQueen from Claude, ChatGPT or Cursor over MCP — or automate with n8n.'
            )}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          className="shrink-0 text-pqSoft rtl:-scale-x-100"
        >
          <path
            d="m9 6 6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </>
  );
};

/**
 * The design's empty-thread hero, rendered instead of the old five-paragraph
 * `labels.initial` greeting (owner-approved copy change). CopilotKit would
 * render `initial` as a message, so the label is gone and this overlays the
 * top of the (empty) message column until the first message lands.
 */
const EmptyState: FC = () => {
  const { messages } = useCopilotMessagesContext();
  const params = useParams<{ id: string }>();
  // Existing threads start with an empty context while their messages load —
  // without the id gate the hero flashes over every old conversation.
  if (messages.length || params.id !== 'new') {
    return null;
  }
  return (
    // z-[2]: the SDK's message scroller carries z-index 1 and would otherwise
    // swallow the suggestion card's clicks.
    <div
      data-copilot-empty="1"
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex flex-col items-center gap-[18px] px-[40px] pt-[56px] pb-[30px] text-center"
    >
      <EmptyStateHero />
    </div>
  );
};

/**
 * Agents chat column when AI is off: same LOOK as a live thread (hero +
 * working composer + user bubbles) without mounting CopilotKit. Typing and
 * send append to a local list only — no `/copilot/agent` call, no assistant
 * reply, no CombinedError overlay.
 */
const UnconfiguredAgentShell: FC = () => {
  const t = useT();
  const { properties, openChannels } = useContext(PropertiesContext);
  const [messages, setMessages] = useState<{ id: string; content: string }[]>(
    []
  );
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ path: string; id: string }[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const canSend = text.trim().length > 0 || media.length > 0;

  const setMediaFromEvent = useCallback(
    (e: {
      target: {
        name: string;
        value?: { id: string; path: string }[];
      };
    }) => setMedia(e.target.value || []),
    []
  );

  const send = useCallback(() => {
    const content =
      text.trim() +
      (media.length > 0
        ? '\n[--Media--]' +
          media
            .map((m) =>
              hasExtension(m.path, 'mp4')
                ? `Video: ${m.path}`
                : `Image: ${m.path}`
            )
            .join('\n') +
          '\n[--Media--]'
        : '');
    if (!content.trim()) {
      return;
    }
    setMessages((prev) => [...prev, { id: makeId(10), content }]);
    setText('');
    setMedia([]);
    textareaRef.current?.focus();
  }, [text, media]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleComposerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    if (target.tagName === 'TEXTAREA') return;
    textareaRef.current?.focus();
  };

  return (
    <div className="trz agent bg-pqInner flex flex-col transition-all flex-1 relative min-w-0">
      <div className="absolute inset-0 flex flex-col">
        <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto">
          {!messages.length ? (
            <div
              data-copilot-empty="1"
              className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex flex-col items-center gap-[18px] px-[40px] pt-[56px] pb-[30px] text-center"
            >
              <EmptyStateHero />
            </div>
          ) : (
            <div className="copilotKitMessagesContainer flex flex-col">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="copilotKitMessage copilotKitUserMessage whitespace-pre-wrap"
                >
                  {m.content}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="copilotKitInputContainer">
          <div className="mx-auto flex w-full max-w-[840px] flex-col gap-[8px]">
            <div className="flex flex-wrap items-center gap-[6px] p-[0_2px_2px]">
              {properties.length === 0 ? (
                <button
                  type="button"
                  onClick={openChannels}
                  className="flex h-[26px] items-center gap-[6px] rounded-full bg-pqSettings px-[9px] text-[11.5px] font-[600] text-pqSoft shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover hover:text-pqText"
                >
                  <span>
                    {t('no_channels_selected', 'No channels selected')}
                  </span>
                  <span className="text-pqMuted" aria-hidden="true">
                    ·
                  </span>
                  <span>{t('select_channels', 'Select channels')}</span>
                </button>
              ) : (
                <>
                  <span className="text-[11.5px] text-pqSoft">
                    {t('agent_posting_to', 'Posting to')}
                  </span>
                  {properties.map((p: AgentIntegration) => (
                    <span
                      key={p.id}
                      className="flex h-[26px] items-center gap-[6px] rounded-full bg-pqSettings ps-[4px] pe-[9px] text-[11.5px] font-[600] text-pqText"
                    >
                      <span className="relative h-[18px] w-[18px] shrink-0">
                        <ImageWithFallback
                          fallbackSrc={`/icons/platforms/${p.identifier}.png`}
                          src={p.picture}
                          className="rounded-[5px]"
                          alt={p.identifier}
                          width={18}
                          height={18}
                        />
                        <span className="absolute -bottom-[4px] -end-[4px] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-pqBadgeRing">
                          <SafeImage
                            src={`/icons/platforms/${p.identifier}.png`}
                            className="rounded-full"
                            alt={p.identifier}
                            width={11}
                            height={11}
                          />
                        </span>
                      </span>
                      {p.name}
                    </span>
                  ))}
                </>
              )}
            </div>
            <div
              className="copilotKitInput flex cursor-text flex-col gap-[7px]"
              onClick={handleComposerClick}
            >
              <MediaPortal
                part="thumbs"
                value={text}
                media={media}
                setMedia={setMediaFromEvent}
              />
              <AutoResizingTextarea
                ref={textareaRef}
                placeholder={t(
                  'agent_placeholder',
                  'Ask Copilot to draft, schedule or generate…'
                )}
                autoFocus={false}
                maxRows={6}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !isComposing
                  ) {
                    event.preventDefault();
                    if (canSend) {
                      send();
                    }
                  }
                }}
              />
              <div className="copilotKitInputControls flex items-end gap-[4px] pb-[2px]">
                <div className="min-w-0 flex-1">
                  <MediaPortal
                    part="toolbar"
                    value={text}
                    media={media}
                    setMedia={setMediaFromEvent}
                  />
                </div>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={send}
                  data-test-id="copilot-chat-ready"
                  data-pq-agent-send="1"
                  className="copilotKitInputControlButton shrink-0"
                  aria-label={t('send_message', 'Send message')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                      d="M12 19V5M6 11l6-6 6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * The design puts a 26px "PQ" tile beside assistant messages. The SDK's own
 * AssistantMessage keeps rendering the content and the regenerate / copy /
 * thumbs controls — it is only wrapped, never replaced.
 */
const AssistantMessage: FC<AssistantMessageProps> = (props) => {
  if (!props.message?.content) {
    return <CopilotAssistantMessage {...props} />;
  }
  return (
    <div className="flex items-start gap-[10px]">
      <span className="mt-[10px] flex h-[26px] w-[26px] shrink-0 select-none items-center justify-center rounded-[8px] bg-pqBrandSoft text-[10.5px] font-[700] text-pqFocused">
        PQ
      </span>
      <div className="min-w-0 flex-1">
        <CopilotAssistantMessage {...props} />
      </div>
    </div>
  );
};

const LoadMessages: FC<{ id: string }> = ({ id }) => {
  const { messages, setMessages } = useCopilotMessagesContext();
  const fetch = useFetch();
  const currentId = useRef<string | null>(null);
  const loaded = useRef<{ id: string; messages: CopilotMessage[] } | null>(
    null
  );

  const loadMessages = useCallback(async (idToSet: string) => {
    const data = await (await fetch(`/copilot/${idToSet}/list`)).json();
    const list = data.messages.map((p: any) => {
      return new TextMessage({
        content: p.content.content,
        role: p.role,
      });
    });

    if (currentId.current !== idToSet) {
      return;
    }

    loaded.current = { id: idToSet, messages: list };
    setMessages(list);
  }, []);

  useEffect(() => {
    currentId.current = id;
    if (id === 'new') {
      loaded.current = { id, messages: [] };
      setMessages([]);
      return;
    }
    loaded.current = null;
    loadMessages(id);
  }, [id]);

  // CopilotKit resolves loadAgentState to an empty list for Mastra local agents
  // and can clobber the messages we hold, depending on which request resolves last
  useEffect(() => {
    if (loaded.current?.id !== id) {
      return;
    }

    if (messages.length) {
      loaded.current.messages = messages;
      return;
    }

    if (loaded.current.messages.length) {
      setMessages(loaded.current.messages);
    }
  }, [messages, id]);

  return null;
};

const Message: FC<UserMessageProps> = (props) => {
  const convertContentToImagesAndVideo = useMemo(() => {
    return (props.message?.content || '')
      .replace(/Video: (http.*mp4\n)/g, (match, p1) => {
        return `<video controls class="h-[150px] w-[150px] rounded-[8px] mb-[10px]"><source src="${p1.trim()}" type="video/mp4">Your browser does not support the video tag.</video>`;
      })
      .replace(/Image: (http.*\n)/g, (match, p1) => {
        return `<img src="${p1.trim()}" class="h-[150px] w-[150px] max-w-full rounded-[8px]" />`;
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
      className="copilotKitMessage copilotKitUserMessage"
      dangerouslySetInnerHTML={{ __html: convertContentToImagesAndVideo }}
    />
  );
};
const NewInput: FC<InputProps> = (props) => {
  const [media, setMedia] = useState([] as { path: string; id: string }[]);
  const [value, setValue] = useState('');
  const { properties } = useContext(PropertiesContext);
  const copilotIntegrations = useMemo(
    () => selectableIntegrations(properties),
    [properties]
  );
  const setMediaFromEvent = useCallback(
    (e: {
      target: {
        name: string;
        value?: { id: string; path: string }[];
      };
    }) => setMedia(e.target.value || []),
    []
  );
  return (
    <>
      <Input
        {...props}
        attachments={
          <MediaPortal
            part="thumbs"
            value={value}
            media={media}
            setMedia={setMediaFromEvent}
          />
        }
        toolbar={
          <MediaPortal
            part="toolbar"
            value={value}
            media={media}
            setMedia={setMediaFromEvent}
          />
        }
        onChange={setValue}
        onSend={(text) => {
          const send = props.onSend(
            text +
              (media.length > 0
                ? '\n[--Media--]' +
                  media
                    .map((m) =>
                      hasExtension(m.path, 'mp4')
                        ? `Video: ${m.path}`
                        : `Image: ${m.path}`
                    )
                    .join('\n') +
                  '\n[--Media--]'
                : '') +
              `
${
  copilotIntegrations.length
    ? `[--integrations--]
Use the following social media platforms: ${JSON.stringify(
        copilotIntegrations.map((p) => ({
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
  const usableProperties = useMemo(
    () => selectableIntegrations(properties),
    [properties]
  );
  const startModal = useCallback(async () => {
    for (const integration of args.list) {
      const channel = usableProperties.find(
        (p) => p.id === integration.integrationId
      );
      // Skip reconnect / in-between channels — same guard as Select Channels.
      if (!channel) {
        continue;
      }
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
                integrationPicture: channel.picture || '',
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
                  integration: channel,
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
                allIntegrations={usableProperties}
                integrations={[channel]}
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
  }, [args, respond, usableProperties, modals]);

  useEffect(() => {
    startModal();
  }, []);
  return (
    <div onClick={() => respond('continue')}>
      Opening the composer…
    </div>
  );
};
