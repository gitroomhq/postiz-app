'use client';

import { ContinuePickerItem } from '../continue-picker-item';
import { withContinueProvider } from '../with-continue-provider';

interface GmbItem {
  id: string;
  name: string;
  accountName: string;
  locationName: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface GmbSelection {
  id: string;
  accountName: string;
  locationName: string;
}

export const GmbContinue = withContinueProvider<GmbItem, GmbSelection>({
  endpoint: 'pages',
  swrKey: 'load-gmb-locations',
  titleKey: 'select_location',
  titleDefault: 'Select Business Location',
  emptyStateMessages: [
    {
      key: 'gmb_no_locations_found',
      text: "We couldn't find any business locations connected to your account.",
    },
    {
      key: 'gmb_ensure_business_verified',
      text: 'Please ensure your business is verified on Google My Business.',
    },
    {
      key: 'gmb_try_again',
      text: 'Please close this dialog, delete the integration and try again.',
    },
  ],
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({
    id: item.id,
    accountName: item.accountName,
    locationName: item.locationName,
  }),
  transformSaveData: (selection) =>
    Array.isArray(selection) ? { pages: selection } : selection,
  isSelected: (item, selection) => selection?.id === item.id,
  renderItem: (item) => (
    <ContinuePickerItem
      pictureUrl={item.picture?.data?.url}
      name={item.name}
      meta="Google Business"
      fallback={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      }
    />
  ),
});
