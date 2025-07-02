import { FC } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const list = [
  {
    value: 1,
    label: 'Every Day',
  },
  {
    value: 2,
    label: 'Every Two Days',
  },
  {
    value: 3,
    label: 'Every Three Days',
  },
  {
    value: 4,
    label: 'Every Four Days',
  },
  {
    value: 5,
    label: 'Every Five Days',
  },
  {
    value: 6,
    label: 'Every Six Days',
  },
  {
    value: 7,
    label: 'Every Week',
  },
  {
    value: 14,
    label: 'Every Two Weeks',
  },
  {
    value: 30,
    label: 'Every Month',
  },
];
export const RepeatComponent: FC<{
  repeat: number | null;
  onChange: (newVal: number) => void;
}> = (props) => {
  const { repeat } = props;
  const t = useT();
  return (
    <Select
      disableForm={true}
      label=""
      hideErrors={true}
      name="repeat"
      value={repeat ? repeat : undefined}
      onChange={(e) => props.onChange(Number(e.target.value))}
    >
      <option>{t('repeat_post_every', 'Repeat Post Every...')}</option>
      {list.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </Select>
  );
};
