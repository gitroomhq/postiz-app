'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';

interface ModelOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  value: string;
  options: ModelOption[];
  placeholder: string;
  emptyOptionLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Combobox simples com busca por texto.
 * - Mostra label do item selecionado quando colapsado
 * - Quando aberto, expõe input pra filtrar e lista virtualizada simples
 * - Suporta opção vazia (passa "" no onChange) via `emptyOptionLabel`
 */
export const SearchableModelSelect: React.FC<Props> = ({
  value,
  options,
  placeholder,
  emptyOptionLabel,
  disabled,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => {
    if (!value) return emptyOptionLabel ?? placeholder;
    const found = options.find((o) => o.value === value);
    return found?.label ?? value;
  }, [value, options, emptyOptionLabel, placeholder]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.hint ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Foco automático no input ao abrir
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const handleSelect = useCallback(
    (newValue: string) => {
      onChange(newValue);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={clsx(
          'w-full bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] pl-[16px] pr-[40px] outline-none text-[14px] text-textColor flex items-center text-left',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span
          className={clsx(
            'flex-1 truncate',
            !value && 'text-customColor18'
          )}
        >
          {selectedLabel}
        </span>
        <svg
          className={clsx(
            'absolute end-[14px] top-1/2 -translate-y-1/2 transition-transform',
            open && 'rotate-180'
          )}
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-[100] mt-[4px] w-full bg-newBgColorInner border border-newTableBorder rounded-[8px] shadow-lg overflow-hidden">
          <div className="p-[8px] border-b border-fifth">
            <input
              ref={inputRef}
              type="text"
              className="w-full h-[36px] px-[12px] bg-sixth border border-fifth rounded-[6px] outline-none text-[14px]"
              placeholder="Buscar modelo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {emptyOptionLabel && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={clsx(
                  'w-full text-left px-[16px] py-[8px] text-[14px] hover:bg-boxHover transition-colors',
                  !value && 'bg-boxHover'
                )}
              >
                <span className="text-customColor18">{emptyOptionLabel}</span>
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-[16px] py-[12px] text-[13px] text-customColor18 text-center">
                Nenhum modelo encontrado
              </div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={clsx(
                  'w-full text-left px-[16px] py-[8px] text-[14px] hover:bg-boxHover transition-colors flex flex-col gap-[2px]',
                  value === opt.value && 'bg-boxHover'
                )}
              >
                <span>{opt.label}</span>
                {opt.hint && (
                  <span className="text-[11px] text-customColor18">
                    {opt.hint}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
