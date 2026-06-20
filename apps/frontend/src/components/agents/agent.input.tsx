import React, { useMemo, useRef, useState } from 'react';
import { useCopilotContext, useCopilotReadable } from '@copilotkit/react-core';
import AutoResizingTextarea from '@gitroom/frontend/components/agents/agent.textarea';
import { useChatContext } from '@copilotkit/react-ui';
import { InputProps } from '@copilotkit/react-ui/dist/components/chat/props';
const MAX_NEWLINES = 6;

export const Input = ({
  inProgress,
  onSend,
  isVisible = false,
  onStop,
  onUpload,
  hideStopButton = false,
  onChange,
}: InputProps & { onChange: (value: string) => void }) => {
  const context = useChatContext();
  const copilotContext = useCopilotContext();
  const showPoweredBy = !copilotContext.copilotApiConfig?.publicApiKey;

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
  const buttonIcon =
    isInProgress && !hideStopButton
      ? context.icons.stopIcon
      : context.icons.sendIcon;

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
    <div
      className={`copilotKitInputContainer ${
        showPoweredBy ? 'poweredByContainer' : ''
      }`}
    >
      <div className="copilotKitInput" onClick={handleDivClick}>
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
        <div className="copilotKitInputControls">
          {onUpload && (
            <button onClick={onUpload} className="copilotKitInputControlButton">
              {context.icons.uploadIcon}
            </button>
          )}

          <div style={{ flexGrow: 1 }} />
          <button
            disabled={sendDisabled}
            onClick={isInProgress && !hideStopButton ? onStop : send}
            data-copilotkit-in-progress={inProgress}
            data-test-id={
              inProgress
                ? 'copilot-chat-request-in-progress'
                : 'copilot-chat-ready'
            }
            className="copilotKitInputControlButton"
          >
            {buttonIcon}
          </button>
        </div>
      </div>
    </div>
  );
};
