import { FC } from 'react';
import { Web3ProviderInterface } from '@gitroom/frontend/components/launches/web3/web3.provider.interface';
import { WarpcasterProvider } from '@gitroom/frontend/components/launches/web3/providers/warpcaster.provider';
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
    identifier: 'warpcast',
    component: WarpcasterProvider,
  },
];
