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
  AgentConfigContext,
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
import { Button } from '@gitroom/react/form/button';

type AiOption =
  | 'openai' | 'gemini' | 'deepseek' | 'groq' | 'mistral'
  | 'minimax' | 'qwen' | 'zai' | 'openrouter'
  | 'lmstudio' | 'ollama' | 'llamacpp' | 'mlx'
  | 'other';

interface AiOptionDef {
  id: AiOption;
  label: string;
  description: string;
  link: string;
  defaultApiKey: string;
  defaultBaseUrl: string;
  defaultModel: string;
  tomlBlock: string;
  envBlock: string;
  category: 'cloud' | 'local';
}

const AI_OPTIONS: AiOptionDef[] = [
  // ── Cloud providers ──────────────────────────────────────────────
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4.1 and more',
    link: 'https://platform.openai.com/api-keys',
    defaultApiKey: '',
    defaultBaseUrl: '',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "sk-proj-your-key-here"',
    envBlock: 'OPENAI_API_KEY=sk-proj-your-key-here',
    category: 'cloud',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google Gemini 2.5 Flash, Pro, and more',
    link: 'https://aistudio.google.com/apikey',
    defaultApiKey: '',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    tomlBlock: '[ai]\napi_key = "your-gemini-key"\nbase_url = "https://generativelanguage.googleapis.com/v1beta/openai"\nchat_model = "gemini-2.5-flash"',
    envBlock: 'OPENAI_API_KEY=your-gemini-key\nOPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai\nOPENAI_CHAT_MODEL=gemini-2.5-flash',
    category: 'cloud',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek-V3 and R1 reasoning models',
    link: 'https://platform.deepseek.com/api_keys',
    defaultApiKey: '',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    tomlBlock: '[ai]\napi_key = "your-deepseek-key"\nbase_url = "https://api.deepseek.com"\nchat_model = "deepseek-chat"',
    envBlock: 'OPENAI_API_KEY=your-deepseek-key\nOPENAI_BASE_URL=https://api.deepseek.com\nOPENAI_CHAT_MODEL=deepseek-chat',
    category: 'cloud',
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Ultra-fast inference for Llama, Mixtral, and more',
    link: 'https://console.groq.com/keys',
    defaultApiKey: '',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    tomlBlock: '[ai]\napi_key = "your-groq-key"\nbase_url = "https://api.groq.com/openai/v1"\nchat_model = "llama-3.3-70b-versatile"',
    envBlock: 'OPENAI_API_KEY=your-groq-key\nOPENAI_BASE_URL=https://api.groq.com/openai/v1\nOPENAI_CHAT_MODEL=llama-3.3-70b-versatile',
    category: 'cloud',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'Mistral Large, Small, and Codestral',
    link: 'https://console.mistral.ai/api-keys',
    defaultApiKey: '',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    tomlBlock: '[ai]\napi_key = "your-mistral-key"\nbase_url = "https://api.mistral.ai/v1"\nchat_model = "mistral-large-latest"',
    envBlock: 'OPENAI_API_KEY=your-mistral-key\nOPENAI_BASE_URL=https://api.mistral.ai/v1\nOPENAI_CHAT_MODEL=mistral-large-latest',
    category: 'cloud',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    description: 'MiniMax M2.5 multimodal models',
    link: 'https://platform.minimaxi.com/',
    defaultApiKey: '',
    defaultBaseUrl: 'https://api.minimaxi.com/v1',
    defaultModel: 'MiniMax-M2.5',
    tomlBlock: '[ai]\napi_key = "your-minimax-key"\nbase_url = "https://api.minimaxi.com/v1"\nchat_model = "MiniMax-M2.5"',
    envBlock: 'OPENAI_API_KEY=your-minimax-key\nOPENAI_BASE_URL=https://api.minimaxi.com/v1\nOPENAI_CHAT_MODEL=MiniMax-M2.5',
    category: 'cloud',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    description: 'Alibaba Qwen-Plus, Qwen-Max, and more',
    link: 'https://bailian.console.aliyun.com/',
    defaultApiKey: '',
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    tomlBlock: '[ai]\napi_key = "your-dashscope-key"\nbase_url = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"\nchat_model = "qwen-plus"',
    envBlock: 'OPENAI_API_KEY=your-dashscope-key\nOPENAI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1\nOPENAI_CHAT_MODEL=qwen-plus',
    category: 'cloud',
  },
  {
    id: 'zai',
    label: 'z.ai',
    description: 'GLM-4 and ChatGLM models',
    link: 'https://z.ai/',
    defaultApiKey: '',
    defaultBaseUrl: 'https://open.z.ai/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "your-zai-key"\nbase_url = "https://open.z.ai/v1"\nchat_model = "your-model-name"',
    envBlock: 'OPENAI_API_KEY=your-zai-key\nOPENAI_BASE_URL=https://open.z.ai/v1\nOPENAI_CHAT_MODEL=your-model-name',
    category: 'cloud',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: '100+ models (Claude, Gemini, Llama, etc.) via one API',
    link: 'https://openrouter.ai/keys',
    defaultApiKey: '',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "your-openrouter-key"\nbase_url = "https://openrouter.ai/api/v1"\nchat_model = "anthropic/claude-sonnet-4"',
    envBlock: 'OPENAI_API_KEY=your-openrouter-key\nOPENAI_BASE_URL=https://openrouter.ai/api/v1\nOPENAI_CHAT_MODEL=anthropic/claude-sonnet-4',
    category: 'cloud',
  },
  // ── Local providers ──────────────────────────────────────────────
  {
    id: 'lmstudio',
    label: 'LM Studio',
    description: 'GUI app for running local models. Load a model and start the server.',
    link: 'https://lmstudio.ai/',
    defaultApiKey: 'local',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "local"\nbase_url = "http://localhost:1234/v1"\nchat_model = "your-loaded-model-name"',
    envBlock: 'OPENAI_API_KEY=local\nOPENAI_BASE_URL=http://localhost:1234/v1\nOPENAI_CHAT_MODEL=your-loaded-model-name',
    category: 'local',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    description: 'Run Llama, Gemma, Phi, and more locally via CLI.',
    link: 'https://ollama.com/',
    defaultApiKey: 'local',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "local"\nbase_url = "http://localhost:11434/v1"\nchat_model = "your-model-name"',
    envBlock: 'OPENAI_API_KEY=local\nOPENAI_BASE_URL=http://localhost:11434/v1\nOPENAI_CHAT_MODEL=your-model-name',
    category: 'local',
  },
  {
    id: 'mlx',
    label: 'MLX',
    description: 'Apple Silicon-optimized local inference via mlx-lm.',
    link: 'https://github.com/ml-explore/mlx-lm',
    defaultApiKey: 'local',
    defaultBaseUrl: 'http://localhost:8080/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "local"\nbase_url = "http://localhost:8080/v1"\nchat_model = "your-model-name"',
    envBlock: 'OPENAI_API_KEY=local\nOPENAI_BASE_URL=http://localhost:8080/v1\nOPENAI_CHAT_MODEL=your-model-name',
    category: 'local',
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp',
    description: 'High-performance local inference. Run llama-server with a GGUF model.',
    link: 'https://github.com/ggerganov/llama.cpp',
    defaultApiKey: 'local',
    defaultBaseUrl: 'http://localhost:8080/v1',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "local"\nbase_url = "http://localhost:8080/v1"\nchat_model = "your-model-name"',
    envBlock: 'OPENAI_API_KEY=local\nOPENAI_BASE_URL=http://localhost:8080/v1\nOPENAI_CHAT_MODEL=your-model-name',
    category: 'local',
  },
  // ── Custom ───────────────────────────────────────────────────────
  {
    id: 'other',
    label: 'Other',
    description: 'Any OpenAI-compatible endpoint: Together AI, Cohere, Azure OpenAI, vLLM, etc.',
    link: '',
    defaultApiKey: '',
    defaultBaseUrl: '',
    defaultModel: '',
    tomlBlock: '[ai]\napi_key = "your-api-key"\nbase_url = "https://your-api-endpoint/v1"\nchat_model = "model-name"',
    envBlock: 'OPENAI_API_KEY=your-api-key\nOPENAI_BASE_URL=https://your-api-endpoint/v1\nOPENAI_CHAT_MODEL=model-name',
    category: 'cloud',
  },
];

const useAiStatus = () => {
  const fetch = useFetch();
  const loadStatus = useCallback(async () => {
    return (await fetch('/copilot/status')).json();
  }, [fetch]);
  return useSWR('/copilot/status', loadStatus, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

const AiSetupGuide: FC<{ onConfigured: () => void; errorMessage?: string }> = ({ onConfigured, errorMessage }) => {
  const { desktopMode } = useVariables();

  // Server mode: admin configures env vars, not end users.
  if (!desktopMode) {
    return <AiSetupGuideServer />;
  }

  // Desktop mode: interactive form — configure and connect on the fly.
  return <AiSetupGuideDesktop onConfigured={onConfigured} errorMessage={errorMessage} />;
};

const ProviderTabs: FC<{ active: AiOption; onChange: (id: AiOption) => void }> = ({ active, onChange }) => {
  const cloudOpts = AI_OPTIONS.filter((o) => o.category === 'cloud');
  const localOpts = AI_OPTIONS.filter((o) => o.category === 'local');

  const renderBtn = (opt: AiOptionDef) => (
    <button
      key={opt.id}
      onClick={() => onChange(opt.id)}
      className={clsx(
        'px-[12px] py-[6px] rounded-[6px] text-[13px] font-[500] border transition-colors',
        active === opt.id
          ? 'bg-forth text-white border-transparent'
          : 'bg-transparent text-customColor18 border-fifth hover:text-textColor'
      )}
    >
      {opt.label}
    </button>
  );

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="text-[11px] text-customColor18 uppercase tracking-wider font-[600]">Cloud</div>
      <div className="flex gap-[6px] flex-wrap">
        {cloudOpts.map(renderBtn)}
      </div>
      <div className="text-[11px] text-customColor18 uppercase tracking-wider font-[600] mt-[4px]">Local</div>
      <div className="flex gap-[6px] flex-wrap">
        {localOpts.map(renderBtn)}
      </div>
    </div>
  );
};

const ProviderInfo: FC<{ option: AiOptionDef }> = ({ option }) => {
  const openLink = useCallback(() => {
    if (!option.link) return;
    // window.open works in both browser and WKWebView (Tauri registers a navigation handler)
    window.open(option.link, '_blank');
  }, [option.link]);

  return (
    <div className="flex items-start gap-[12px] bg-newBgColorInner rounded-[8px] px-[14px] py-[10px] border border-newTableBorder">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-[500] text-textColor">{option.label}</div>
        <div className="text-[12px] text-customColor18 mt-[2px]">{option.description}</div>
      </div>
      {option.link && (
        <button
          type="button"
          onClick={openLink}
          className="shrink-0 text-[12px] text-forth hover:underline mt-[2px]"
        >
          Get API key &rarr;
        </button>
      )}
    </div>
  );
};

const AiSetupGuideServer: FC = () => {
  const [activeOption, setActiveOption] = useState<AiOption>('openai');
  const [copied, setCopied] = useState('');
  const option = AI_OPTIONS.find((o) => o.id === activeOption)!;

  const copy = useCallback((key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-[32px] overflow-auto">
      <div className="max-w-[560px] w-full flex flex-col gap-[24px]">
        <div className="flex flex-col gap-[8px]">
          <div className="text-[20px] font-[600] text-textColor">AI Not Configured</div>
          <div className="text-[14px] text-customColor18">
            Your server administrator needs to set AI environment variables. Add the following to your server .env file and restart:
          </div>
        </div>

        <ProviderTabs active={activeOption} onChange={setActiveOption} />

        <ProviderInfo option={option} />

        <div className="bg-newBgColorInner rounded-[8px] p-[16px] font-mono text-[13px] relative border border-newTableBorder">
          <pre className="whitespace-pre-wrap text-textColor pr-[60px]">{option.envBlock}</pre>
          <button
            onClick={() => copy('env', option.envBlock)}
            className="absolute top-[8px] right-[8px] px-[10px] py-[6px] bg-forth text-white rounded-[8px] text-[12px]"
          >
            {copied === 'env' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AiSetupGuideDesktop: FC<{ onConfigured: () => void; errorMessage?: string }> = ({ onConfigured, errorMessage }) => {
  const fetch = useFetch();
  const [activeOption, setActiveOption] = useState<AiOption>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Probe state: auto-checks connection + fetches models
  const [probeStatus, setProbeStatus] = useState<'idle' | 'probing' | 'connected' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const probeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const option = AI_OPTIONS.find((o) => o.id === activeOption)!;

  // On mount: load saved config from backend so selections persist between relaunches
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/copilot/status');
        const data = await res.json();
        if (data.baseUrl || data.model) {
          // Match baseUrl to a known provider
          const matched = AI_OPTIONS.find(
            (o) => o.defaultBaseUrl && data.baseUrl && data.baseUrl.startsWith(o.defaultBaseUrl)
          );
          if (matched) {
            setActiveOption(matched.id);
          }
          if (data.baseUrl) setBaseUrl(data.baseUrl);
          if (data.model) setChatModel(data.model);
          // Don't restore API key — it's a secret, user re-enters or it's already in process.env
        }
      } catch {
        // status fetch failed, use defaults
      }
      setInitialized(true);
    })();
  }, [fetch]);

  // Pre-fill defaults when switching provider tabs (skip on initial load from saved config)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!initialized) return;
    const opt = AI_OPTIONS.find((o) => o.id === activeOption)!;
    setApiKey(opt.defaultApiKey);
    setBaseUrl(opt.defaultBaseUrl);
    setChatModel(opt.defaultModel);
    setError('');
    setProbeStatus('idle');
    setAvailableModels([]);
  }, [activeOption, initialized]);

  // Auto-probe when API key + base URL change (debounced)
  useEffect(() => {
    if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    const key = apiKey.trim();
    if (!key) {
      setProbeStatus('idle');
      setAvailableModels([]);
      return;
    }
    setProbeStatus('probing');
    probeTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/copilot/probe', {
          method: 'POST',
          body: JSON.stringify({ apiKey: key, baseUrl: baseUrl.trim() || undefined }),
        });
        const data = await res.json();
        if (data.connected) {
          setProbeStatus('connected');
          const models = data.models || [];
          setAvailableModels(models);
          // Auto-select current model in dropdown if it's in the list
          if (chatModel && models.includes(chatModel)) {
            // already selected, keep it
          } else if (option.defaultModel && models.includes(option.defaultModel)) {
            setChatModel(option.defaultModel);
          }
        } else {
          setProbeStatus('error');
          setAvailableModels([]);
        }
      } catch {
        setProbeStatus('error');
        setAvailableModels([]);
      }
    }, 800);
    return () => { if (probeTimerRef.current) clearTimeout(probeTimerRef.current); };
  }, [apiKey, baseUrl, fetch, chatModel, option.defaultModel]);

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
      const modelToSend = chatModel === '__custom__' ? '' : chatModel.trim();
      const res = await fetch('/copilot/configure', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
          chatModel: modelToSend || undefined,
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

  // Inline style to guarantee interactivity — overrides any inherited
  // pointer-events:none from .blurMe, CopilotKit CSS, or Mantine overlays.
  const inputStyle: React.CSSProperties = { pointerEvents: 'auto', userSelect: 'text' };

  const probeIndicator = probeStatus === 'probing' ? (
    <span className="text-[11px] text-customColor18 ml-[8px]">checking...</span>
  ) : probeStatus === 'connected' ? (
    <span className="text-[11px] text-green-400 ml-[8px]">connected</span>
  ) : probeStatus === 'error' ? (
    <span className="text-[11px] text-red-400 ml-[8px]">unreachable</span>
  ) : null;

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 p-[32px] overflow-auto relative z-[10]"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="max-w-[560px] w-full flex flex-col gap-[24px]">
        <div className="flex flex-col gap-[8px]">
          <div className="text-[20px] font-[600] text-textColor">Configure AI</div>
          <div className="text-[14px] text-customColor18">
            {errorMessage
              ? 'Could not connect to AI. Update your settings and try again.'
              : 'Connect an AI provider to enable the Postiz agent. Settings are applied instantly.'}
          </div>
        </div>

        <ProviderTabs active={activeOption} onChange={setActiveOption} />

        <ProviderInfo option={option} />

        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <div className="text-[14px] flex items-center">
              API Key {probeIndicator}
            </div>
            <div className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="h-full bg-transparent outline-none flex-1 text-[14px] text-textColor px-[16px] placeholder-textColor cursor-text"
                style={inputStyle}
                placeholder={activeOption === 'openai' ? 'sk-proj-...' : 'local'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="px-[12px] text-[12px] text-customColor18 hover:text-textColor"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="text-[14px]">
              Base URL <span className="text-customColor18">(optional for OpenAI)</span>
            </div>
            <div className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] flex items-center">
              <input
                type="text"
                className="h-full bg-transparent outline-none flex-1 text-[14px] text-textColor px-[16px] placeholder-textColor cursor-text"
                style={inputStyle}
                placeholder="https://api.openai.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="text-[14px]">
              Model{' '}
              <span className="text-customColor18">
                {availableModels.length > 0
                  ? `\u2014 auto-detected ${availableModels.length} available`
                  : probeStatus === 'connected'
                    ? '\u2014 using provider default'
                    : '(optional)'}
              </span>
            </div>
            {availableModels.length > 0 && chatModel !== '__custom__' ? (
              <div className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] flex items-center">
                <select
                  className={clsx(
                    'h-full bg-transparent outline-none flex-1 text-[14px] px-[12px] cursor-pointer',
                    chatModel ? 'text-textColor' : 'text-customColor18'
                  )}
                  style={inputStyle}
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                >
                  <option value="" className="text-customColor18">{option.defaultModel ? `Default (${option.defaultModel})` : 'Provider default'}</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-[8px]">
                <div className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] flex items-center flex-1">
                  <input
                    type="text"
                    className="h-full bg-transparent outline-none flex-1 text-[14px] text-textColor px-[16px] placeholder-textColor cursor-text"
                    style={inputStyle}
                    placeholder={option.defaultModel || 'model name'}
                    value={chatModel === '__custom__' ? '' : chatModel}
                    onChange={(e) => setChatModel(e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                {availableModels.length > 0 && (
                  <button
                    type="button"
                    className="text-[12px] text-customColor18 hover:text-textColor shrink-0 px-[8px]"
                    onClick={() => setChatModel(option.defaultModel || '')}
                  >
                    Back to list
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {(error || errorMessage) && (
          <div className="text-red-400 text-[12px]">{error || errorMessage}</div>
        )}

        <Button
          onClick={connect}
          loading={connecting}
          className="rounded-[8px]"
        >
          Connect
        </Button>

        <details className="text-left">
          <summary className="text-[12px] text-customColor18 cursor-pointer select-none">
            Manual configuration (config file)
          </summary>
          <div className="mt-[12px] flex flex-col gap-[8px]">
            <div className="text-[12px] text-customColor18 font-mono bg-newBgColorInner rounded-[8px] px-[10px] py-[6px] border border-newTableBorder break-all">
              {/mac|darwin/i.test((navigator as any).userAgentData?.platform || navigator.platform || '')
                ? '~/Library/Application Support/Postiz/config.toml'
                : /win/i.test((navigator as any).userAgentData?.platform || navigator.platform || '')
                  ? '%APPDATA%\\Postiz\\config.toml'
                  : '~/.local/share/postiz/config.toml'}
            </div>
            <div className="bg-newBgColorInner rounded-[8px] p-[16px] font-mono text-[13px] relative border border-newTableBorder">
              <pre className="whitespace-pre-wrap text-textColor pr-[60px]">{option.tomlBlock}</pre>
              <button
                onClick={() => copy('toml', option.tomlBlock)}
                className="absolute top-[8px] right-[8px] px-[10px] py-[6px] bg-forth text-white rounded-[8px] text-[12px]"
              >
                {copied === 'toml' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

class CopilotErrorBoundary extends React.Component<
  { children: React.ReactNode; desktopMode: boolean; onConfigured: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      if (this.props.desktopMode) {
        return (
          <AiSetupGuide
            onConfigured={() => {
              this.setState({ error: null });
              this.props.onConfigured();
            }}
            errorMessage={this.state.error.message}
          />
        );
      }
      return (
        <div className="flex flex-col items-center justify-center flex-1 p-[32px]">
          <div className="max-w-[480px] w-full flex flex-col gap-[16px] text-center">
            <div className="text-[20px] font-[600] text-textColor">Could not connect to AI</div>
            <div className="text-[14px] text-customColor18">
              Check OPENAI_API_KEY and OPENAI_BASE_URL in your server .env and restart.
            </div>
            <details className="w-full text-left">
              <summary className="text-[12px] text-customColor18 cursor-pointer select-none">Technical details</summary>
              <div className="text-[12px] text-customColor18 font-mono bg-newBgColorInner rounded-[8px] p-[12px] mt-[8px] break-all border border-newTableBorder">
                {this.state.error.message}
              </div>
            </details>
            <button
              className="mt-[8px] bg-forth text-white px-[24px] h-[40px] rounded-[8px] text-[14px] font-[600] hover:opacity-90"
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
  const t = useT();
  const { showConfig, setShowConfig } = useContext(AgentConfigContext);

  // Desktop: check status so we can show the interactive config form.
  // Server: skip the check entirely — render CopilotKit immediately, identical to main.
  // The only server-side improvement is the backend returning a proper 503
  // instead of hanging when the key is missing.
  const { data: status, error: statusError, mutate: mutateStatus } = useAiStatus();

  if (desktopMode) {
    // Still loading status — show nothing briefly while fetch completes
    if (!status && !statusError) {
      return null;
    }
    // Not configured, fetch error, or user requested config view
    if (!status?.configured || showConfig) {
      return (
        <AiSetupGuide
          onConfigured={() => {
            setShowConfig(false);
            mutateStatus();
          }}
        />
      );
    }
  }

  return (
    <CopilotErrorBoundary desktopMode={desktopMode} onConfigured={() => mutateStatus()}>
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
