'use client';

import {
  ContinuePickerItem,
  continuePickerHandle,
  continuePickerInitial,
  joinContinuePickerMeta,
} from '../continue-picker-item';
import { withContinueProvider } from '../with-continue-provider';

interface LinkedinItem {
  id: string;
  pageId: string;
  username: string;
  name: string;
  picture: string;
}

interface LinkedinSelection {
  id: string;
  pageId: string;
}

export const LinkedinContinue = withContinueProvider<
  LinkedinItem,
  LinkedinSelection
>({
  endpoint: 'companies',
  swrKey: 'load-linkedin-pages',
  titleKey: 'select_linkedin_page',
  titleDefault: 'Select LinkedIn Page',
  emptyStateMessages: [
    {
      key: 'we_couldn_t_find_any_business_connected_to_your_linkedin_page',
      text: "We couldn't find any business connected to your LinkedIn Page.",
    },
    {
      key: 'please_close_this_dialog_create_a_new_page_and_add_a_new_channel_again',
      text: 'Please close this dialog, create a new page, and add a new channel again.',
    },
  ],
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id, pageId: item.pageId }),
  transformSaveData: (selection) =>
    Array.isArray(selection)
      ? { pages: selection.map((item) => item.id) }
      : { page: selection.id },
  isSelected: (item, selection) => selection?.id === item.id,
  renderItem: (item) => (
    <ContinuePickerItem
      pictureUrl={item.picture}
      name={item.name}
      meta={joinContinuePickerMeta(continuePickerHandle(item.username))}
      fallback={continuePickerInitial(item.name)}
    />
  ),
});
