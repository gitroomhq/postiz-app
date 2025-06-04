import { FC } from 'react';
import { Web3ProviderInterface } from '@gitroom/frontend/components/launches/web3/web3.provider.interface';
import { WrapcasterProvider } from '@gitroom/frontend/components/launches/web3/providers/wrapcaster.provider';
import { TelegramProvider } from '@gitroom/frontend/components/launches/web3/providers/telegram.provider';
export const web3List: {
  identifier: string;
  component: FC<Web3ProviderInterface>;
}[] = [
  {
    identifier: 'telegram',
    component: TelegramProvider,
  },
  {
    identifier: 'wrapcast',
    component: WrapcasterProvider,
  },
];
