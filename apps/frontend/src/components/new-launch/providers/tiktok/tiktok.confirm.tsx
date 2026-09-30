'use client';

// postmonster: TT-13 - explicit confirmation before anything is sent to TikTok
// (Content Sharing Guidelines UX 5c: "must only start sending content materials
// to TikTok after the user has expressly consent to the upload"). The summary
// shows who it posts to, the chosen visibility, interactions, disclosure and
// when it goes out - nothing is sent until Confirm.

import { useCallback } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import {
  tikTokPrivacyLabel,
} from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.gate';

export interface TikTokConfirmPost {
  integration: { id: string; identifier: string; name: string };
  settings: any;
  isPhoto: boolean;
}

interface CreatorInfoResponse {
  ok: boolean;
  canPost?: boolean;
  reconnect?: boolean;
  message?: string;
  creator?: {
    creator_username: string;
    creator_nickname: string;
    creator_avatar_url: string;
  } | null;
}

export const useTikTokConfirm = () => {
  const modal = useModals();
  const fetch = useFetch();
  const t = useT();

  return useCallback(
    async (
      posts: TikTokConfirmPost[],
      when: { isNow: boolean; label: string }
    ): Promise<boolean> => {
      const summaries = await Promise.all(
        posts.map(async (post) => {
          let creator: CreatorInfoResponse['creator'] = null;
          try {
            const response: CreatorInfoResponse = await (
              await fetch(
                `/integrations/tiktok/${post.integration.id}/creator-info`
              )
            ).json();
            creator = response?.creator || null;
          } catch {
            creator = null;
          }
          return { post, creator };
        })
      );

      return new Promise<boolean>((resolve) => {
        const finish = (result: boolean) => {
          modal.closeById('tiktok-confirm');
          resolve(result);
        };

        modal.openModal({
          id: 'tiktok-confirm',
          title: t('confirm_tiktok_post', 'Confirm TikTok post'),
          closeOnClickOutside: false,
          closeOnEscape: true,
          withCloseButton: false,
          children: (
            <div className="flex flex-col gap-[16px] text-textColor">
              {summaries.map(({ post, creator }) => {
                const settings = post.settings || {};
                const interactions = post.isPhoto
                  ? `Comments: ${settings.comment ? 'on' : 'off'}`
                  : `Comments: ${settings.comment ? 'on' : 'off'} · Duet: ${
                      settings.duet ? 'on' : 'off'
                    } · Stitch: ${settings.stitch ? 'on' : 'off'}`;
                const disclosure = !settings.disclose
                  ? 'No commercial disclosure'
                  : [
                      settings.brand_organic_toggle ? 'Your brand' : null,
                      settings.brand_content_toggle ? 'Branded content' : null,
                    ]
                      .filter(Boolean)
                      .join(' + ');
                return (
                  <div
                    key={post.integration.id}
                    className="flex flex-col gap-[6px] border border-borderPreview rounded-[8px] p-[12px]"
                  >
                    <div className="text-[16px] font-[600]">
                      {t('post_to_tiktok_as', 'Post to TikTok as')}{' '}
                      {creator?.creator_username
                        ? `@${creator.creator_username}`
                        : post.integration.name}
                    </div>
                    <div className="text-[14px]">
                      {t('visibility', 'Visibility')}:{' '}
                      {tikTokPrivacyLabel(settings.privacy_level)}
                    </div>
                    <div className="text-[14px]">{interactions}</div>
                    <div className="text-[14px]">{disclosure}</div>
                    <div className="text-[14px]">
                      {t('when', 'When')}: {when.label}
                    </div>
                  </div>
                );
              })}
              <div className="flex w-full gap-[10px]">
                <div className="flex-1 flex">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => finish(false)}
                  >
                    {t('cancel', 'Cancel')}
                  </Button>
                </div>
                <div className="flex-1 flex">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => finish(true)}
                  >
                    {t('confirm_post', 'Confirm')}
                  </Button>
                </div>
              </div>
            </div>
          ),
        });
      });
    },
    [modal, fetch, t]
  );
};
