import { FC } from "react";
import { FormProvider, useForm } from 'react-hook-form';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Title } from '@tremor/react';
import { Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import { Input } from '@clickvote/frontend/components/form/input';
import { SettingsInterface } from "@clickvote/interfaces";

type FormValues = SettingsInterface;

export const SettingsAPIKeys: FC<{ settings: SettingsInterface }> = (props) => {
  const { settings } = props;
  const methods = useForm<FormValues>({
    mode: 'all',
  });

  const showToast = (message: string) => {
    toast.success(message + '!');
  };

  return (
    <FormProvider {...methods}>
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
  );
}