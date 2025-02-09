import { FC, useCallback, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useFormContext } from 'react-hook-form';
import interClass from '../helpers/inter.font';
import { Button } from './button';

export const ColorPicker: FC<{
  name: string;
  label: string;
  enabled: boolean;
  onChange?: (params: { target: { name: string, value: string } }) => void;
  value?: string;
  canBeCancelled: boolean;
}> = (props) => {
  const { name, label, enabled,  value, canBeCancelled, onChange } = props;
  const form = useFormContext();
  const color = onChange ? {onChange} : form.register(name);
  const watch = onChange ? value : form.watch(name);
  const [enabledState, setEnabledState] = useState(!!watch);

  const enable = useCallback(async () => {
    await color.onChange({ target: { name, value: '#FFFFFF' } });
    setEnabledState(true);
  }, []);

  const cancel = useCallback(async () => {
    await color.onChange({ target: { name, value: '' } });
    setEnabledState(false);
  }, []);

  if (!enabledState) {
    return (
      <div>
        <Button onClick={enable}>Enable color picker</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <div>
        {!!label && <div className={`${interClass} text-[14px]`}>{label}</div>}
      </div>
      {canBeCancelled && (
        <div>
          <Button onClick={cancel}>Cancel the color picker</Button>
        </div>
      )}
      <div className="flex items-end gap-[20px]">
        <div>
          <HexColorPicker
            color={watch}
            onChange={(value) => color.onChange({ target: { name, value } })}
          />
        </div>
        <div className="flex gap-[10px]">
          <div>
            <div
              className="w-[20px] h-[20px]"
              style={{ backgroundColor: watch }}
            />
          </div>
          <div>{watch}</div>
        </div>
      </div>
    </div>
  );
};
