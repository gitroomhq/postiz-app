import React, { FC, useCallback, useEffect } from 'react';
import interClass from '../helpers/inter.font';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';

import { ReactComponent as DeleteWhiteSvg } from '../../../../apps/frontend/src/assets/delete-w.svg';
import { ReactComponent as DeleteBlueSvg } from '../../../../apps/frontend/src/assets/delete-b.svg';
import { ReactComponent as AddSvg } from '../../../../apps/frontend/src/assets/add.svg';

export const Total: FC<{ name: string; customOnChange?: () => void }> = (
  props
) => {
  const { name, customOnChange } = props;
  const form = useFormContext();
  const value = form.watch(props.name);

  const changeNumber = useCallback(
    (value: number) => () => {
      if (value === 0) {
        return;
      }
      form.setValue(name, value);
    },
    [value]
  );

  useEffect(() => {
    if (customOnChange) {
      customOnChange();
    }
  }, [value, customOnChange]);

  return (
    <div className="flex flex-col gap-[6px] relative w-[158px]">
      <div className={`${interClass} text-[14px]`}>Total</div>
      <div
        className={clsx(
          'bg-input h-[44px] border-fifth border rounded-[4px] text-inputText placeholder-inputText items-center justify-center flex'
        )}
      >
        <div className="flex-1 px-[16px] text-[14px] select-none flex gap-[8px] items-center">
          <div onClick={changeNumber(value - 1)}>
            {value === 1 ? <DeleteBlueSvg /> : <DeleteWhiteSvg />}
          </div>
          <div className="flex-1 text-white text-[14px] text-center">
            {value}
          </div>
          <div onClick={changeNumber(value + 1)}>
            <AddSvg />
          </div>
        </div>
      </div>
    </div>
  );
};
