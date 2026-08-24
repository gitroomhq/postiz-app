'use client';

import { withContinueProvider } from '../with-continue-provider';

interface FacebookItem {
  id: string;
  username: string;
  name: string;
  disabledReason?: 'not_granted' | 'no_publish_permission';
  picture: {
    data: {
      url: string;
    };
  };
}

export const FacebookContinue = withContinueProvider<FacebookItem, string>({
  endpoint: 'pages',
  swrKey: 'load-facebook-pages',
  titleKey: 'select_page',
  titleDefault: 'Select Page:',
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
            text: 'You did not grant Postiz access to this Page in the Facebook dialog.\nReconnect the channel and tick this Page when Facebook asks which Pages to share.',
          },
        }
      : item.disabledReason === 'no_publish_permission'
      ? {
          caption: {
            key: 'not_selectable_your_account_cant_publish_to_this_page',
            text: "Not selectable: your account can't publish to this Page",
          },
          tooltip: {
            key: 'your_facebook_account_does_not_have_content_permissions_on_this_page',
            text: 'Your Facebook account does not have content permissions on this Page.\nAsk a Page admin to give you full (or content/publishing) access under Page settings > Page access (or in the Business Portfolio), then reconnect the channel.',
          },
        }
      : undefined,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => item.id,
  transformSaveData: (selection) => ({ page: selection }),
  isSelected: (item, selection) => selection === item.id,
  renderItem: (item) => (
    <>
      <div>
        <img className="w-full" src={item.picture.data.url} alt="profile" />
      </div>
      <div>{item.name}</div>
    </>
  ),
});
