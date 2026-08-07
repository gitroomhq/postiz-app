import React, {
  ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCopilotContext } from '@copilotkit/react-core';
import AutoResizingTextarea from '@gitroom/frontend/components/agents/agent.textarea';
import { useChatContext } from '@copilotkit/react-ui';
import { InputProps } from '@copilotkit/react-ui/dist/components/chat/props';
import { PropertiesContext } from '@gitroom/frontend/components/agents/agent';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const MAX_NEWLINES = 6;

export const Input = ({
  inProgress,
  onSend,
  isVisible = false,
  onStop,
  onUpload,
  hideStopButton = false,
  onChange,
  toolbar,
  attachments,
}: InputProps & {
  onChange: (value: string) => void;
  toolbar?: ReactNode;
  // Design: 58×58 media thumbs sit above the textarea inside the pop card.
  attachments?: ReactNode;
}) => {
  const context = useChatContext();
  const copilotContext = useCopilotContext();
  const { properties, openChannels } = useContext(PropertiesContext);
  const t = useT();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  const handleDivClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // If the user clicked a button or inside a button, don't focus the textarea
    if (target.closest('button')) return;

    // If the user clicked the textarea, do nothing (it's already focused)
    if (target.tagName === 'TEXTAREA') return;

    // Otherwise, focus the textarea
    textareaRef.current?.focus();
  };

  const [text, setText] = useState('');
  const send = () => {
    if (inProgress) return;
    onSend(text);
    setText('');

    textareaRef.current?.focus();
  };

  const isInProgress = inProgress;

  const canSend = useMemo(() => {
    const interruptEvent = copilotContext.langGraphInterruptAction?.event;
    const interruptInProgress =
      interruptEvent?.name === 'LangGraphInterruptEvent' &&
      !interruptEvent?.response;

    return !isInProgress && text.trim().length > 0 && !interruptInProgress;
  }, [copilotContext.langGraphInterruptAction?.event, isInProgress, text]);

  const canStop = useMemo(() => {
    return isInProgress && !hideStopButton;
  }, [isInProgress, hideStopButton]);

  const sendDisabled = !canSend && !canStop;

  return (
    <div className="copilotKitInputContainer">
      <div className="mx-auto flex w-full max-w-[840px] flex-col gap-[8px]">
        <div className="flex flex-wrap items-center gap-[6px] p-[0_2px_2px]">
          {properties.length === 0 ? (
            // Design soft label is "No channel selected"; owner polish: muted
            // pill CTA that opens the left channel list (same selection WORK).
            <button
              type="button"
              onClick={openChannels}
              className="flex h-[26px] items-center gap-[6px] rounded-full bg-pqSettings px-[9px] text-[11.5px] font-[600] text-pqSoft shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover hover:text-pqText"
            >
              <span>{t('no_channels_selected', 'No channels selected')}</span>
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
              {properties.map((p) => (
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
          onClick={handleDivClick}
        >
          {attachments}
          <AutoResizingTextarea
            ref={textareaRef}
            placeholder={context.labels.placeholder}
            autoFocus={false}
            maxRows={MAX_NEWLINES}
            value={text}
            onChange={(event) => {
              onChange(event.target.value);
              setText(event.target.value);
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
                event.preventDefault();
                if (canSend) {
                  send();
                }
              }
            }}
          />
          <div className="copilotKitInputControls flex items-end gap-[4px] pb-[2px]">
            {onUpload && (
              <button
                onClick={onUpload}
                className="copilotKitInputControlButton"
              >
                {context.icons.uploadIcon}
              </button>
            )}

            <div className="min-w-0 flex-1">{toolbar}</div>
            <button
              disabled={sendDisabled}
              onClick={isInProgress && !hideStopButton ? onStop : send}
              data-copilotkit-in-progress={inProgress}
              data-test-id={
                inProgress
                  ? 'copilot-chat-request-in-progress'
                  : 'copilot-chat-ready'
              }
              className="copilotKitInputControlButton shrink-0"
              data-pq-agent-send="1"
            >
              {isInProgress && !hideStopButton ? (
                context.icons.stopIcon
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M12 19V5M6 11l6-6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
