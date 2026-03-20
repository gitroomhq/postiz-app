import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import Loading from 'react-loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';

// Keep this in sync with new platforms added in the future that don't support hashtags.
const NO_HASHTAG_PLATFORMS = new Set([
  'discord', 
  'slack',
  'reddit', 
  'kick', 
  'twitch', 
  'dribbble', 
  'lemmy',
  'medium', 
  'devto', 
  'hashnode', 
  'wordpress', 
  'listmonk', 
  'moltbook',
  'skool', 
  'whop', 
  'gmb', 
  'nostr', 
  'wrapcast',
]);

export const AiHashtag: FC<{ value: string }> = (props) => {
  const t = useT();
  const { value } = props;
  const [loading, setLoading] = useState(false);
  const fetch = useFetch();

  const {
    global,
    internal,
    selectedIntegrations,
    setLocked,
    setHashtags,
    chars,
    current,
  } = useLaunchStore(
    useShallow((state) => ({
      global: state.global,
      internal: state.internal,
      selectedIntegrations: state.selectedIntegrations,
      setLocked: state.setLocked,
      setHashtags: state.setHashtags,
      chars: state.chars,
      current: state.current,
    }))
  );

  const hasEligiblePlatform = selectedIntegrations.some(
    (si) => !NO_HASHTAG_PLATFORMS.has(si.integration.identifier)
  );

  const isDisabled = 
    value.trim().length === 0 || 
    selectedIntegrations.length === 0 || 
    !hasEligiblePlatform;

  const generateHashtags = useCallback(async () => {
    if (!isDisabled && !loading) {
      setLoading(true);
      setLocked(true);

      const eligiblePlatforms = selectedIntegrations.filter(
          (si) => !NO_HASHTAG_PLATFORMS.has(si.integration.identifier)
        );
      const targetIntegrations = current && current !== 'global'
        ? eligiblePlatforms.filter((si) => si.integration.id === current)
        : eligiblePlatforms;

      const platformContents: { platform: string; content: string }[] = [];

      for (const si of targetIntegrations) {
        const internalEntry = internal.find(
          (i) => i.integration.id === si.integration.id
        );
        const content = stripHtmlValidation(
          'normal',
          internalEntry
            ? internalEntry.integrationValue[0].content
            : global[0].content,
          true
        );
        platformContents.push({
          platform: si.integration.identifier,
          content,
        });
      }

      const grouped: Record<string, string[]> = {};
      for (const pc of platformContents) {
        const key = pc.content;
        if (grouped[key] == null) {
          grouped[key] = []
        };
        grouped[key].push(pc.platform);
      }

      const parts: string[] = [];
      const entries = Object.entries(grouped);
      if (entries.length === 1) {
        const [content, platforms] = entries[0];
        parts.push(
          `Content: ${content}\nPlatforms: ${platforms.join(', ')}`
        );
      } else {
        parts.push('Platform-specific content:');
        for (const [content, platforms] of entries) {
          for (const platform of platforms) {
            parts.push(`${platform}: ${content}`);
          }
        }
      }

      const promptString = parts.join('\n');

      const result = await (
        await fetch('/posts/generate-hashtags', {
          method: 'POST',
          body: JSON.stringify({ content: promptString }),
        })
      ).json();

      if (result.hashtags) {
        for (const entry of result.hashtags) {
          const matchingIntegrations = selectedIntegrations.filter(
            (si) => si.integration.identifier === entry.platform
          );
          
          for (const si of matchingIntegrations) {
            if (entry.hashtags.length > 0) {
              const maxLen = chars[si.integration.id];
              const internalEntry = internal.find(
                (i) => i.integration.id === si.integration.id
              );
              const contentLen = stripHtmlValidation(
                'normal',
                internalEntry?.integrationValue?.[0]?.content ||
                  global[0]?.content || '',
                true
              ).length;

              const tags: string[] = [];
              for (const hashtag of entry.hashtags) {
                const combined = '\n' + [...tags, hashtag].join(' ');
                if (contentLen + combined.length <= maxLen) {
                  tags.push(hashtag);
                }
              }
              setHashtags(si.integration.id, tags);
            }
          }
        }
      }
      setLoading(false);
      setLocked(false);
    }
  }, [loading, global, internal, selectedIntegrations, setLocked, setHashtags, fetch, chars, current, isDisabled]);

  return (
    <div
      {...(isDisabled
        ? {
            'data-tooltip-id': 'tooltip',
            'data-tooltip-content':
              selectedIntegrations.length === 0
                ? 'Please select at least one platform'
                : !hasEligiblePlatform
                ? 'None of the selected platforms support hashtags'
                : 'Please add some content to generate AI hashtags',
          }
        : {})}
      onClick={generateHashtags}
      className={clsx(
        'cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px] relative',
        isDisabled && 'opacity-50'
      )}
    >
      {loading && (
        <div className="absolute start-[50%] -translate-x-[50%]">
          <Loading height={15} width={15} type="spin" color="#fff" />
        </div>
      )}
      <div
        className={clsx(
          'flex gap-[5px] items-center',
          loading && 'invisible'
        )}
      >
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M3.33 6h9.34M3.33 10h9.34M6.5 2L5 14M11 2l-1.5 12"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-[10px] font-[600] iconBreak:hidden block">
          {t('ai', 'AI')} Hashtags
        </div>
      </div>
    </div>
  );
};
