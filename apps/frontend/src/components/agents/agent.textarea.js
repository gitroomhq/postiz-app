import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
const AutoResizingTextarea = forwardRef(({ maxRows = 1, placeholder, value, onChange, onKeyDown, onCompositionStart, onCompositionEnd, autoFocus, }, ref) => {
    const internalTextareaRef = useRef(null);
    const [maxHeight, setMaxHeight] = useState(0);
    useImperativeHandle(ref, () => internalTextareaRef.current);
    useEffect(() => {
        const calculateMaxHeight = () => {
            const textarea = internalTextareaRef.current;
            if (textarea) {
                textarea.style.height = "auto";
                const singleRowHeight = textarea.scrollHeight;
                setMaxHeight(singleRowHeight * maxRows);
                if (autoFocus) {
                    textarea.focus();
                }
            }
        };
        calculateMaxHeight();
    }, [maxRows]);
    useEffect(() => {
        const textarea = internalTextareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        }
    }, [value, maxHeight]);
    return (<textarea ref={internalTextareaRef} value={value} onChange={onChange} onKeyDown={onKeyDown} onCompositionStart={onCompositionStart} onCompositionEnd={onCompositionEnd} placeholder={placeholder} style={{
            overflow: "auto",
            resize: "none",
            maxHeight: `${maxHeight}px`,
        }} rows={1}/>);
});
export default AutoResizingTextarea;
//# sourceMappingURL=agent.textarea.js.map