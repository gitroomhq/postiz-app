'use client';

import { withContinueProvider } from '../with-continue-provider';

interface BeehiivPublicationItem {
  id: string;
  name: string;
  username?: string;
}

interface BeehiivPublicationSelection {
  id: string;
}

export const BeehiivContinue = withContinueProvider<
  BeehiivPublicationItem,
  BeehiivPublicationSelection
>({
  endpoint: 'pages',
  swrKey: 'load-beehiiv-publications',
  titleKey: 'select_beehiiv_publication',
  titleDefault: 'Select beehiiv Publication:',
  emptyStateMessages: [
    {
      key: 'beehiiv_no_publications_found',
      text: "We couldn't find any beehiiv publications connected to your account.",
    },
    {
      key: 'beehiiv_ensure_publication_exists',
      text: 'Please ensure your beehiiv workspace has a publication you can post to.',
    },
    {
      key: 'beehiiv_try_again',
      text: 'Please close this dialog, delete the integration and try again.',
    },
  ],
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
  renderItem: (item) => (
    <>
      <div className="flex justify-center">
        <div className="w-[80px] h-[80px] bg-input rounded-full flex items-center justify-center text-[32px] font-semibold">
          {item.name?.charAt(0)?.toUpperCase()}
        </div>
      </div>
      <div className="text-sm font-medium">{item.name}</div>
      {item.username && (
        <div className="text-xs text-gray-500 break-all">{item.username}</div>
      )}
    </>
  ),
});
