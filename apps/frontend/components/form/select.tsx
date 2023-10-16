import { ChangeEvent, DetailedHTMLProps, FC, InputHTMLAttributes } from 'react';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';

export const Select: FC<
  DetailedHTMLProps<
    InputHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  > & {
    label?: string;
    postChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
    hideErrors?: boolean;
  }
> = (props) => {
  const {
    label,
    children,
    hideErrors,
    className,
    postChange,
    onChange,
    ...all
  } = props;
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const { onChange: onChangeFromRegistration, ...allOther } = register(
    all.name!
  );
  const onChangeFunc = async (event: ChangeEvent<HTMLSelectElement>) => {
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
      {!!label && <div className="mb-2">{label}</div>}
      <select
        {...allOther}
        {...all}
        onChange={onChangeFunc}
        className={clsx(`p-2 w-full bg-[#fff0fd]/10 border border-[#EBECED]/20 rounded-md`, className)}
      >
        {children}
      </select>
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
    </>
  );
};
