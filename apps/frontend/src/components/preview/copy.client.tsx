'use client';

import { Button } from '@gitroom/react/form/button';
import copy from 'copy-to-clipboard';
import { useCallback } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
export const CopyClient = ({ postId }: { postId: string }) => {
  const toast = useToaster();
  const t = useT();
  const fetch = useFetch();
  const { externalReviewEnabled } = useVariables();
  const copyToClipboard = useCallback(async () => {
    const response = await fetch(`/posts/${postId}/review-link`, {
      method: 'POST',
    });
    if (!response.ok) {
      toast.show(
        t('could_not_generate_review_link', 'Could not generate review link'),
        'warning'
      );
      return;
    }
    const { url } = await response.json();
    copy(url);
    toast.show(t('link_copied_to_clipboard', 'Link copied to clipboard'), 'success');
  }, []);
  if (!externalReviewEnabled) {
    return null;
  }

  return (
    <Button onClick={copyToClipboard}>
      {t('share_with_a_client', 'Share with a client')}
    </Button>
  );
};
