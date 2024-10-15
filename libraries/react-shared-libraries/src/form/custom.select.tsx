import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import interClass from '../helpers/inter.font';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';

import { ReactComponent as ArrowDownSvg } from '../../../../apps/frontend/src/assets/arrow-down.svg';
import { ReactComponent as CloseXSvg } from '../../../../apps/frontend/src/assets/close-x.svg';

export const CustomSelect: FC<{
  error?: any;
  disableForm?: boolean;
  label: string;
  name: string;
  placeholder?: string;
  removeError?: boolean;
  onChange?: () => void;
  className?: string;
  options: Array<{ value: string; label: string; icon?: ReactNode }>;
}> = (props) => {
  const {
    options,
    onChange,
    placeholder,
    className,
    removeError,
    label,
    ...rest
  } = props;
  const form = useFormContext();
  const value = form.watch(props.name);
  const [isOpen, setIsOpen] = useState(false);

  const err = useMemo(() => {
    const split = (props.name + '.value').split('.');
    let errIn = form?.formState?.errors;
    for (let i = 0; i < split.length; i++) {
      // @ts-ignore
      errIn = errIn?.[split[i]];
    }
    return errIn?.message;
  }, [props.name, form]);

  const option = useMemo(() => {
    if (value?.value && options.length) {
      return (
        options.find((option) => option.value === value.value) || {
          label: placeholder,
          icon: false,
        }
      );
    }

    return { label: placeholder };
  }, [value, options]);

  const changeOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const setOption = useCallback(
    (newOption: any) => (e: any) => {
      form.setValue(props.name, newOption);
      setIsOpen(false);
      e.stopPropagation();
    },
    []
  );

  useEffect(() => {
    if (onChange) {
      onChange();
    }
  }, [value]);

  return (
    <div className={clsx('flex flex-col gap-[6px] relative', className)}>
      {!!label && <div className={`${interClass} text-[14px]`}>{label}</div>}
      <div
        className={clsx(
          'bg-input h-[44px] border-fifth border rounded-[4px] text-inputText placeholder-inputText items-center justify-center flex'
        )}
        onClick={changeOpen}
      >
        <div className="flex-1 pl-[16px] text-[14px] select-none flex gap-[8px]">
          {!!option.icon && (
            <div className="flex justify-center items-center">
              {option.icon}
            </div>
          )}

          {option.label}
        </div>
        <div className="pr-[16px] flex gap-[8px]">
          <div>
            <ArrowDownSvg />
          </div>
          {!!value && (
            <div onClick={setOption(undefined)}>
              <CloseXSvg />
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div
          className={clsx(
            label && !removeError && '-mt-[23px]',
            'z-[100] absolute w-full top-[100%] left-0 flex items-center rounded-bl-[4px] rounded-br-[4px] flex-col bg-fifth gap-[1px] border-l border-r border-b border-fifth overflow-hidden'
          )}
        >
          {options.map((option) => (
            <div
              onClick={setOption(option)}
              className="px-[16px] py-[8px] bg-input w-full flex gap-[8px] hover:bg-customColor3 select-none cursor-pointer"
            >
              {!!option.icon && (
                <div className="flex justify-center items-center">
                  {option.icon}
                </div>
              )}
              <div className="flex-1 text-[14px]">{option.label}</div>
            </div>
          ))}
        </div>
      )}
      {!removeError && (
        <div className="text-red-400 text-[12px]">
          {(err as any) || <>&nbsp;</>}
        </div>
      )}
    </div>
  );
};
