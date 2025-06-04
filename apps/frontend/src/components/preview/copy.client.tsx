'use client';

import { Button } from '@gitroom/react/form/button';
import copy from 'copy-to-clipboard';
import { useCallback } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const CopyClient = () => {
  const toast = useToaster();
  const t = useT();
  const copyToClipboard = useCallback(() => {
    toast.show(
      t('link_copied_to_clipboard', 'Link copied to clipboard'),
      'success'
    );
    copy(window.location.href.split?.('?')?.shift()!);
  }, []);
  return (
    <Button onClick={copyToClipboard}>
      {t('share_with_a_client', 'Share with a client')}
    </Button>
  );
};
