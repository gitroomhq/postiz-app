import { FC } from 'react';
import { SettingsInterface } from '@clickvote/interfaces';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Title } from '@tremor/react';
import { Copy } from 'lucide-react';
import { toast } from "react-toastify";

export const ApiKeys: FC<{ settings: SettingsInterface }> = (props) => {
  const { settings } = props;

  const methods = useForm();

  return (
    <FormProvider {...methods}>
      <Title className="bg-words-purple bg-clip-text text-transparent text-4xl mb-7">
        API Keys
      </Title>
      <CopyToClipboard text={settings.publicKey} onCopy={() => toast.success('Public key copied to the clipboard')}>
        <div className="flex mb-5">
          <div className="flex-1">
            <Input
              hideErrors={true}
              label="Public Key"
              name="publicKey"
              value={settings.publicKey}
              readOnly={true}
            />
          </div>
          <div className="flex items-end ml-2 hover:opacity-70 cursor-pointer">
            <Copy/>
          </div>
        </div>
      </CopyToClipboard>
      <CopyToClipboard text={settings.secretKey} onCopy={() => toast.success('Secret key copied to the clipboard')}>
        <div className="flex">
          <div className="flex-1">
            <Input
              hideErrors={true}
              label="Secret Key"
              name="secretKey"
              type="password"
              value={settings.secretKey}
              readOnly={true}
            />
          </div>
          <div className="flex items-end ml-2 hover:opacity-70 cursor-pointer">
            <Copy/>
          </div>
        </div>
      </CopyToClipboard>
    </FormProvider>
  );
};
