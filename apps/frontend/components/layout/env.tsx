import { useUserContext } from '@clickvote/frontend/helper/user.context';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import { setCookie } from 'cookies-next';
import { Select } from '@clickvote/frontend/components/form/select';

type FormValues = {
  env: string;
};

const resolver: Resolver<FormValues> = async (values) => {
  return {
    values: values.env ? values : {},
    errors: {},
  };
};

export const Env = () => {
  const { user } = useUserContext();
  const methods = useForm<FormValues>({
    mode: 'all',
    values: {
      env: user?.currentEnv?.id || '',
    },
    resolver,
  });

  const submit = (data: FormValues) => {
    setCookie('env', data.env);
    window.location.reload();
  };

  return (
    <FormProvider {...methods}>
      <form className="mr-4">
        <Select hideErrors={true} name="env" label="" postChange={methods.handleSubmit(submit)}>
          {user?.env.map((env) => (
            <option key={env.id} value={env.id} className='text-purple-500'>
              {env.name}
            </option>
          ))}
        </Select>
      </form>
    </FormProvider>
  );
};
