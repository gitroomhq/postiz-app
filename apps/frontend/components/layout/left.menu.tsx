import ActiveLink from '@clickvote/frontend/helper/active.link';
import { useUserContext } from '@clickvote/frontend/helper/user.context';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import { Select } from '@clickvote/frontend/components/form/select';
import { setCookie } from 'cookies-next';

type FormValues = {
  org: string;
};

const resolver: Resolver<FormValues> = async (values) => {
  return {
    values: values.org ? values : {},
    errors: {},
  };
};

const LeftMenu = () => {
  const { user } = useUserContext();
  const methods = useForm<FormValues>({
    mode: 'all',
    values: {
      org: user?.currentOrg?.id || '',
    },
    resolver,
  });

  const submit = (data: FormValues) => {
    setCookie('org', data.org);
    window.location.reload();
  };

  return (
    <div className="border border-[#ffffff]/20 px-4 pl-8 w-60 bg-gradient-to-r bg-[#05050B] flex flex-col">
      <div className="flex-1 flex flex-col pt-7">
        <ActiveLink
          activeClassName="underline font-bold bg-words-purple bg-clip-text text-transparent"
          href="/analytics"
          className="py-4"
        >
          Analytics
        </ActiveLink>
        <ActiveLink
          activeClassName="underline font-bold bg-words-purple bg-clip-text text-transparent"
          href="/votes"
          className="py-4"
        >
          Votes
        </ActiveLink>
        <ActiveLink
          activeClassName="underline font-bold bg-words-purple bg-clip-text text-transparent"
          href="/settings"
          className="py-4"
        >
          Settings
        </ActiveLink>
      </div>
      <div>
        <FormProvider {...methods}>
          <form>
            <Select
              name="org"
              label="Organization"
              postChange={methods.handleSubmit(submit)}
            >
              {user?.org.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export default LeftMenu;
