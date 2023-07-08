import { FC, ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';

export const FormContextRender: FC<{
  children: (values: { [key: string]: any }) => ReactNode;
  variablesToWatch: string[];
}> = (props) => {
  const { children, variablesToWatch } = props;
  const { watch } = useFormContext();

  const a = watch(variablesToWatch);
  const values = Object.values(variablesToWatch).reduce(
    (all, key, index) => ({
      ...all,
      [key]: a[index],
    }),
    {}
  );

  return <>{children(values)}</>;
};
