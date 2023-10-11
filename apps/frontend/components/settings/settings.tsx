import { FC, useContext } from 'react';
import { SettingsInterface } from '@clickvote/interfaces';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { UserContext } from '@clickvote/frontend/helper/user.context';
import { Button } from '@clickvote/frontend/components/form/button';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Title } from '@tremor/react';
import { Copy } from 'lucide-react';

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
    <div className="p-4">
      <FormProvider {...methods}>
        <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
          Settings
        </Title>
        <Input
          label="Organization Name"
          name="name"
          defaultValue={user?.currentOrg.name}
          labelClassName="mt-7"
        />
        <Button type="submit" className="mb-10">
          Update
        </Button>

        <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
          API Keys
        </Title>
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
                labelClassName="mt-7"
              />
            </div>
            <div className="flex items-end ml-2 hover:opacity-70">
              <Copy />
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
            <div className="flex items-end ml-2 hover:opacity-70">
              <Copy />
            </div>
          </div>
        </CopyToClipboard>
      </FormProvider>
    </div>
  );
};
