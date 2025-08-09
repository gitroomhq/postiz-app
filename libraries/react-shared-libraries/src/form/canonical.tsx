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
import { TranslatedLabel } from '../translation/translated-label';

export const Canonical: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    error?: any;
    date: dayjs.Dayjs;
    disableForm?: boolean;
    label: string;
    name: string;
    translationKey?: string;
    translationParams?: Record<string, string | number>;
  }
> = (props) => {
  const {
    label,
    date,
    className,
    disableForm,
    error,
    translationKey,
    translationParams,
    ...rest
  } = props;
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
        target: {
          value: id,
          name: props.name,
        },
      });
    }
    return form.setValue(props.name, id);
  }, [form]);
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center gap-[3px]">
        <div className={`text-[14px]`}>
          <TranslatedLabel
            label={label}
            translationKey={translationKey}
            translationParams={translationParams}
          />
        </div>
        <div>
          <svg
            onClick={onPostSelector}
            className="cursor-pointer"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M27.4602 14.6576C27.4039 14.4173 27.2893 14.1947 27.1264 14.0093C26.9635 13.824 26.7575 13.6817 26.5264 13.5951L19.7214 11.0438L21.4714 2.2938C21.5354 1.97378 21.4933 1.64163 21.3514 1.34773C21.2095 1.05382 20.9757 0.814201 20.6854 0.665207C20.395 0.516214 20.064 0.465978 19.7425 0.52212C19.421 0.578262 19.1266 0.737718 18.9039 0.976302L4.90393 15.9763C4.73549 16.1566 4.61413 16.3756 4.55059 16.614C4.48705 16.8525 4.4833 17.1028 4.53968 17.343C4.59605 17.5832 4.7108 17.8058 4.87377 17.9911C5.03673 18.1763 5.24287 18.3185 5.47393 18.4051L12.2789 20.9563L10.5289 29.7063C10.465 30.0263 10.5071 30.3585 10.649 30.6524C10.7908 30.9463 11.0247 31.1859 11.315 31.3349C11.6054 31.4839 11.9364 31.5341 12.2579 31.478C12.5794 31.4218 12.8738 31.2624 13.0964 31.0238L27.0964 16.0238C27.2647 15.8435 27.3859 15.6245 27.4494 15.3862C27.5128 15.1479 27.5165 14.8976 27.4602 14.6576ZM14.5064 25.1163L15.4714 20.2938C15.5412 19.9446 15.4845 19.5819 15.3113 19.2706C15.1382 18.9594 14.86 18.7199 14.5264 18.5951L8.62518 16.3838L17.4914 6.8838L16.5264 11.7063C16.4566 12.0555 16.5134 12.4182 16.6865 12.7295C16.8597 13.0407 17.1379 13.2802 17.4714 13.4051L23.3752 15.6163L14.5064 25.1163Z"
              fill="#fff"
            />
          </svg>
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
