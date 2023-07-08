import { FC, useContext } from 'react';
import { SettingsInterface } from '@clickvote/interfaces';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { UserContext } from '@clickvote/frontend/helper/user.context';
import { Button } from '@clickvote/frontend/components/form/button';
import CopyToClipboard from 'react-copy-to-clipboard';

export const Settings: FC<{ settings: SettingsInterface }> = (props) => {
  const user = useContext(UserContext);
  const { settings } = props;
  const methods = useForm<SettingsInterface>({
    mode: 'all',
    values: settings,
    resolver: () => ({
      values: settings,
      errors: {},
    }),
  });

  return (
    <FormProvider {...methods}>
      <h2 className="text-3xl mb-5">Settings</h2>
      <Input
        label="Organization Name"
        name="name"
        value={user?.currentOrg.name}
      />
      <Button type="submit" className="mb-10">
        Update
      </Button>

      <h2 className="text-3xl mb-5">API Keys</h2>
      <CopyToClipboard text={settings.publicKey}>
        <div className="flex mb-5">
          <div className="flex-1">
            <Input
              hideErrors={true}
              label="Public Key"
              name="publicKey"
              value={settings.publicKey}
              readOnly={true}
              className="cursor-pointer"
            />
          </div>
          <div className="flex items-end ml-2">
            <Button>Copy</Button>
          </div>
        </div>
      </CopyToClipboard>
      <CopyToClipboard text={settings.secretKey}>
        <div className="flex">
          <div className="flex-1">
            <Input
              hideErrors={true}
              label="Secret Key"
              name="secretKey"
              type="password"
              value={settings.secretKey}
              readOnly={true}
              className="cursor-pointer"
            />
          </div>
          <div className="flex items-end ml-2">
            <Button>Copy</Button>
          </div>
        </div>
      </CopyToClipboard>
    </FormProvider>
  );
};
