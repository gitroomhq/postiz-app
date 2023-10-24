import { FC } from 'react';
import { SettingsInterface } from '@clickvote/interfaces';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useUserContext } from '@clickvote/frontend/helper/user.context';
import { Button } from '@clickvote/frontend/components/form/button';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Title } from '@tremor/react';
import { Copy } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { toast } from 'react-toastify';
import { Prettify } from '@clickvote/frontend/helper/types';

type FormValues = Prettify<
  SettingsInterface & {
    orgName: string;
  }
>;

export const Settings: FC<{ settings: SettingsInterface }> = (props) => {
  const { user, updateUserOrgName } = useUserContext();
  const { settings } = props;

  const methods = useForm<FormValues>({
    mode: 'all',
    defaultValues: { orgName: user?.currentOrg.name ?? '' },
  });

  const { mutate } = useMutation(
    async (orgName: string) =>
      (await axiosInstance.put('/org/update', { name: orgName })).data
  );

  const updateOrgName = ({ orgName }: FormValues) => {
    mutate(orgName, {
      onSuccess: () => {
        toast.success('Organization Name Updated!');
        methods.reset({ orgName: orgName });
        updateUserOrgName(orgName);
      },
      onError: (err) => {
        console.error('Error updating organization name', err);
        toast.error('Ops, something went wrong!');
      },
    });
  };

  const showToast = (message: string) => {
    toast.success(message + '!');
  };

  return (
    <div className="p-4">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(updateOrgName)}>
          <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
            Settings
          </Title>
          <Input
            label="Organization Name"
            name="orgName"
            labelClassName="mt-7"
          />
          <Button type="submit" className="mb-10">
            Update
          </Button>
        </form>

        <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
          API Keys
        </Title>
        <CopyToClipboard
          text={settings.publicKey}
          onCopy={() => showToast('Public Key Copied')}
        >
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
        <CopyToClipboard
          text={settings.secretKey}
          onCopy={() => showToast('Secret Key Copied')}
        >
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
