import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";

interface AutoResizingTextareaProps {
  maxRows?: number;
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
  autoFocus?: boolean;
}

const AutoResizingTextarea = forwardRef<HTMLTextAreaElement, AutoResizingTextareaProps>(
  (
    {
      maxRows = 1,
      placeholder,
      value,
      onChange,
      onKeyDown,
      onCompositionStart,
      onCompositionEnd,
      autoFocus,
    },
    ref,
  ) => {
    const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [maxHeight, setMaxHeight] = useState<number>(0);

    useImperativeHandle(ref, () => internalTextareaRef.current as HTMLTextAreaElement);

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

    return (
      <textarea
        ref={internalTextareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        placeholder={placeholder}
        style={{
          overflow: "auto",
          resize: "none",
          maxHeight: `${maxHeight}px`,
        }}
        rows={1}
      />
    );
  },
);

export default AutoResizingTextarea;