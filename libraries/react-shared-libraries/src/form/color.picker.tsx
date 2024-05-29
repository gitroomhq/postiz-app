import { FC, useCallback, useState } from 'react';
import { Button } from './button';
import { HexColorPicker } from 'react-colorful';
import { useFormContext } from 'react-hook-form';
import interClass from '../helpers/inter.font';

export const ColorPicker: FC<{
  name: string;
  label: string;
  enabled: boolean;
  canBeCancelled: boolean;
}> = (props) => {
  const { name, label, enabled, canBeCancelled } = props;
  const form = useFormContext();
  const [enabledState, setEnabledState] = useState(enabled);
  const color = form.register(name);
  const watch = form.watch(name);

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
        <Button onClick={enable}>
          Enable color picker
        </Button>
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
