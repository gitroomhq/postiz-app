import { ChangeEvent, DetailedHTMLProps, FC, InputHTMLAttributes } from 'react';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';

export const Input: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    label?: string;
    postChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    hideErrors?: boolean;
    labelClassName?: string;
  }
> = (props) => {
  const { label, postChange, hideErrors, className, onChange, ...all } = props;
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const { onChange: onChangeFromRegistration, ...allOther } = register(
    all.name!,
    all?.type === 'number' ? { setValueAs: (v) => +v } : {}
  );
  const onChangeFunc = async (event: ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event);
    }

    await onChangeFromRegistration(event);

    if (postChange) {
      postChange(event);
    }
  };
  return (
    <>
      {!!label && (
        <div className={clsx(`mb-2`, props.labelClassName)}>{label}</div>
      )}
      <input
        {...allOther}
        {...all}
        onChange={onChangeFunc}
        className={clsx(
          `p-2 w-full bg-[#fff0fd]/10 text-[#EBECED] border border-[#EBECED]/20 rounded-md focus:ring-2 focus:ring-light-purple focus:outline-none`,
          className
        )}
      />
      <div className="text-red-500">
        {!hideErrors ? (
          <div className="text-red-500">
            {
              // eslint-disable-next-line no-extra-boolean-cast
              !!errors[all.name!] ? (
                (errors?.[all.name!]?.message as string) || <>&nbsp;</>
              ) : (
                <>&nbsp;</>
              )
            }
          </div>
        ) : (
          <></>
        )}
      </div>
    </>
  );
};
