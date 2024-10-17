'use client';

import React, {
  DetailedHTMLProps,
  FC,
  InputHTMLAttributes,
  useCallback,
  useMemo,
} from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import dayjs from 'dayjs';
import { useShowPostSelector } from '../../../../apps/frontend/src/components/post-url-selector/post.url.selector';
import interClass from '../helpers/inter.font';

import { ReactComponent as FlashSvg } from '../../../../apps/frontend/src/assets/flash-w.svg';

export const Canonical: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    error?: any;
    date: dayjs.Dayjs;
    disableForm?: boolean;
    label: string;
    name: string;
  }
> = (props) => {
  const { label, date, className, disableForm, error, ...rest } = props;
  const form = useFormContext();
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[props?.name!]) return;
    return form?.formState?.errors?.[props?.name!]?.message! as string;
  }, [form?.formState?.errors?.[props?.name!]?.message, error]);

  const postSelector = useShowPostSelector(date);

  const onPostSelector = useCallback(async () => {
    const id = await postSelector();
    if (disableForm) {
      // @ts-ignore
      return rest.onChange({
        // @ts-ignore
        target: { value: id, name: props.name },
      });
    }

    return form.setValue(props.name, id);
  }, [form]);

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center gap-[3px]">
        <div className={`${interClass} text-[14px]`}>{label}</div>
        <div>
          <FlashSvg onClick={onPostSelector} className="cursor-pointer" />
        </div>
      </div>
      <input
        {...(disableForm ? {} : form.register(props.name))}
        className={clsx(
          'bg-input h-[44px] px-[16px] outline-none border-fifth border rounded-[4px] text-inputText placeholder-inputText',
          className
        )}
        {...rest}
      />
      <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
    </div>
  );
};
