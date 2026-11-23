'use client';

import { withContinueProvider } from '../with-continue-provider';

interface InstagramItem {
  id: string;
  pageId: string;
  username: string;
  name: string;
  disabledReason?: 'not_granted';
  picture: {
    data: {
      url: string;
    };
  };
}

interface InstagramSelection {
  id: string;
  pageId: string;
}

export const InstagramContinue = withContinueProvider<
  InstagramItem,
  InstagramSelection
>({
  endpoint: 'pages',
  swrKey: 'load-instagram-pages',
  titleKey: 'select_instagram_account',
  titleDefault: 'Select Instagram Account:',
  emptyStateMessages: [
    {
      key: 'we_couldn_t_find_any_business_connected_to_the_selected_pages',
      text: "We couldn't find any business connected to the selected pages.",
    },
    {
      key: 'we_recommend_you_to_connect_all_the_pages_and_all_the_businesses',
      text: 'We recommend you to connect all the pages and all the businesses.',
    },
    {
      key: 'please_close_this_dialog_delete_your_integration_and_add_a_new_channel_again',
      text: 'Please close this dialog, delete your integration and add a new channel again.',
    },
  ],
  getDisabledMessage: (item) =>
    item.disabledReason === 'not_granted'
      ? {
          caption: {
            key: 'not_selectable_page_not_granted_to_postiz',
            text: 'Not selectable: page not granted to Postiz',
          },
          tooltip: {
            key: 'you_did_not_grant_postiz_access_to_this_page',
            text: 'You did not grant Postiz access to this Page in the Facebook dialog.\nReconnect the channel, click Edit settings on the Facebook screen, choose to opt in to current Pages only, and tick this Page together with your other connected Pages.',
          },
        }
      : undefined,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id, pageId: item.pageId }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
  renderItem: (item) => (
    <>
      <div>
        <img
          className="w-full max-w-[156px]"
          src={item.picture.data.url}
          alt="profile"
        />
      </div>
      <div>{item.name}</div>
    </>
  ),
});
