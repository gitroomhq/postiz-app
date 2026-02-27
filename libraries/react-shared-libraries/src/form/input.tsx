'use client';

import {
  DetailedHTMLProps,
  ForwardedRef,
  InputHTMLAttributes,
  ReactNode,
  forwardRef,
  useEffect,
  useMemo,
} from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';

type InputProps =
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    removeError?: boolean;
    error?: any;
    disableForm?: boolean;
    customUpdate?: () => void;
    label: string;
    name: string;
    icon?: ReactNode;
    translationKey?: string;
    translationParams?: Record<string, string | number>;
  };

function setMergedRef(
  ref: ForwardedRef<HTMLInputElement>,
  registerRef: any,
  node: HTMLInputElement | null
) {
  if (typeof registerRef === 'function') {
    registerRef(node);
  }

  if (typeof ref === 'function') {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    label,
    icon,
    removeError,
    customUpdate,
    className,
    disableForm,
    error,
    translationKey,
    translationParams,
    ...rest
  } = props;
  const form = useFormContext();
  const registerProps = !disableForm && form ? form.register(props.name) : {};
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[props?.name!]) return;
    return form?.formState?.errors?.[props?.name!]?.message! as string;
  }, [form?.formState?.errors?.[props?.name!]?.message, error]);
  const watch = customUpdate ? form?.watch(props.name) : null;
  useEffect(() => {
    if (customUpdate) {
      customUpdate();
    }
  }, [watch]);
  return (
    <div className="flex flex-col gap-[6px]">
      {!!label && (
        <div className={`text-[14px]`}>
          <TranslatedLabel
            label={label}
            translationKey={translationKey}
            translationParams={translationParams}
          />
        </div>
      )}
      <div
        className={clsx(
          'bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] text-textColor placeholder-textColor flex items-center justify-center',
          className
        )}
      >
        {icon && <div className="ps-[16px]">{icon}</div>}
        <input
          className={clsx(
            'h-full bg-transparent outline-none flex-1 text-[14px] text-textColor',
            icon ? 'pl-[8px] pe-[16px]' : 'px-[16px]'
          )}
          {...registerProps}
          {...rest}
          ref={(node) => setMergedRef(ref, (registerProps as any).ref, node)}
        />
      </div>
      {!removeError && (
        <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
