'use client';

import { Button } from '@gitroom/react/form/button';
import copy from 'copy-to-clipboard';
import { useCallback } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const CopyClient = () => {
  const toast = useToaster();

  const copyToClipboard = useCallback(() => {
    toast.show('Link copied to clipboard', 'success');
    copy(window.location.href.split?.('?')?.shift()!);
  }, []);

  return <Button onClick={copyToClipboard}>Share with a client</Button>;
};
