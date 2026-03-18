import React, { useMemo, useRef, useState } from 'react';
import { useCopilotContext } from '@copilotkit/react-core';
import AutoResizingTextarea from "./agent.textarea";
import { useChatContext } from '@copilotkit/react-ui';
const MAX_NEWLINES = 6;
export const Input = ({ inProgress, onSend, isVisible = false, onStop, onUpload, hideStopButton = false, onChange, }) => {
    var _a, _b;
    const context = useChatContext();
    const copilotContext = useCopilotContext();
    const showPoweredBy = !((_a = copilotContext.copilotApiConfig) === null || _a === void 0 ? void 0 : _a.publicApiKey);
    const textareaRef = useRef(null);
    const [isComposing, setIsComposing] = useState(false);
    const handleDivClick = (event) => {
        var _a;
        const target = event.target;
        // If the user clicked a button or inside a button, don't focus the textarea
        if (target.closest('button'))
            return;
        // If the user clicked the textarea, do nothing (it's already focused)
        if (target.tagName === 'TEXTAREA')
            return;
        // Otherwise, focus the textarea
        (_a = textareaRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    };
    const [text, setText] = useState('');
    const send = () => {
        var _a;
        if (inProgress)
            return;
        onSend(text);
        setText('');
        (_a = textareaRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    };
    const isInProgress = inProgress;
    const buttonIcon = isInProgress && !hideStopButton
        ? context.icons.stopIcon
        : context.icons.sendIcon;
    const canSend = useMemo(() => {
        var _a;
        const interruptEvent = (_a = copilotContext.langGraphInterruptAction) === null || _a === void 0 ? void 0 : _a.event;
        const interruptInProgress = (interruptEvent === null || interruptEvent === void 0 ? void 0 : interruptEvent.name) === 'LangGraphInterruptEvent' &&
            !(interruptEvent === null || interruptEvent === void 0 ? void 0 : interruptEvent.response);
        return !isInProgress && text.trim().length > 0 && !interruptInProgress;
    }, [(_b = copilotContext.langGraphInterruptAction) === null || _b === void 0 ? void 0 : _b.event, isInProgress, text]);
    const canStop = useMemo(() => {
        return isInProgress && !hideStopButton;
    }, [isInProgress, hideStopButton]);
    const sendDisabled = !canSend && !canStop;
    return (<div className={`copilotKitInputContainer ${showPoweredBy ? 'poweredByContainer' : ''}`}>
      <div className="copilotKitInput" onClick={handleDivClick}>
        <AutoResizingTextarea ref={textareaRef} placeholder={context.labels.placeholder} autoFocus={false} maxRows={MAX_NEWLINES} value={text} onChange={(event) => {
            onChange(event.target.value);
            setText(event.target.value);
        }} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
                event.preventDefault();
                if (canSend) {
                    send();
                }
            }
        }}/>
        <div className="copilotKitInputControls">
          {onUpload && (<button onClick={onUpload} className="copilotKitInputControlButton">
              {context.icons.uploadIcon}
            </button>)}

          <div style={{ flexGrow: 1 }}/>
          <button disabled={sendDisabled} onClick={isInProgress && !hideStopButton ? onStop : send} data-copilotkit-in-progress={inProgress} data-test-id={inProgress
            ? 'copilot-chat-request-in-progress'
            : 'copilot-chat-ready'} className="copilotKitInputControlButton">
            {buttonIcon}
          </button>
        </div>
      </div>
    </div>);
};
//# sourceMappingURL=agent.input.js.map