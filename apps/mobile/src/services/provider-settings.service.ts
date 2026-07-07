import type { CreatePostMedia } from '@/src/api/posts.api';

export type ProviderSettingsValue =
  | string
  | boolean
  | number
  | Record<string, unknown>
  | Array<string | number | ProviderOption | { value?: Record<string, unknown> }>
  | ProviderOption
  | CreatePostMedia
  | undefined
  | null;

export type ProviderOption = {
  label: string;
  value: string | number;
};

type BaseField = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue?: ProviderSettingsValue;
  visibleWhen?: (settings: Record<string, unknown>) => boolean;
};

export type ProviderSettingsField =
  | (BaseField & { type: 'text' | 'url' | 'date' | 'time' | 'color' })
  | (BaseField & { type: 'multiline' })
  | (BaseField & { type: 'boolean' })
  | (BaseField & { type: 'select'; options: ProviderOption[] })
  | (BaseField & { type: 'communityList'; provider: 'reddit' | 'lemmy' | 'wrapcast' })
  | (BaseField & { type: 'instagramAudio'; functionName: 'audioSearch' })
  | (BaseField & {
      type: 'asyncSelect' | 'asyncMulti';
      functionName: string;
      params?: (settings: Record<string, unknown>) => Record<string, unknown>;
      valueMode?: 'number' | 'string';
    })
  | (BaseField & { type: 'tagInput'; maxItems?: number })
  | (BaseField & { type: 'media'; mediaKind?: 'image' });

export type ProviderSettingsConfig = {
  title: string;
  fields: ProviderSettingsField[];
};

const yesNo: ProviderOption[] = [
  { label: 'No', value: 'no' },
  { label: 'Yes', value: 'yes' },
];

const empty: ProviderSettingsConfig = { fields: [], title: 'Settings' };

const instagramFields: ProviderSettingsField[] = [
  {
    defaultValue: 'post',
    key: 'post_type',
    label: 'Post type',
    options: [
      { label: 'Post / Reel', value: 'post' },
      { label: 'Story', value: 'story' },
    ],
    required: true,
    type: 'select',
  },
  {
    key: 'collaborators',
    label: 'Collaborators',
    maxItems: 3,
    type: 'tagInput',
    visibleWhen: (settings) => settings.post_type !== 'story',
  },
  { key: 'is_trial_reel', label: 'Trial Reel', type: 'boolean', visibleWhen: (settings) => settings.post_type === 'post' },
  {
    defaultValue: 'MANUAL',
    key: 'graduation_strategy',
    label: 'Graduation strategy',
    options: [
      { label: 'Manual', value: 'MANUAL' },
      { label: 'Auto based on performance', value: 'SS_PERFORMANCE' },
    ],
    type: 'select',
    visibleWhen: (settings) => settings.is_trial_reel === true,
  },
];

const threadFinisherFields: ProviderSettingsField[] = [
  {
    defaultValue: false,
    key: 'active_thread_finisher',
    label: 'Add a thread finisher',
    type: 'boolean',
  },
  {
    defaultValue: "That's a wrap",
    key: 'thread_finisher',
    label: 'Thread finisher',
    type: 'multiline',
    visibleWhen: (settings) => settings.active_thread_finisher === true,
  },
];

export const providerSettingsRegistry: Record<string, ProviderSettingsConfig> = {
  devto: {
    title: 'Dev.to settings',
    fields: [
      { key: 'title', label: 'Title', required: true, type: 'text' },
      { key: 'canonical', label: 'Canonical link', type: 'url' },
      { key: 'main_image', label: 'Cover picture', mediaKind: 'image', type: 'media' },
      { key: 'organization', label: 'Organization', functionName: 'organizations', type: 'asyncSelect' },
      { key: 'tags', label: 'Tags', functionName: 'tags', type: 'asyncMulti' },
    ],
  },
  discord: {
    title: 'Discord settings',
    fields: [{ key: 'channel', label: 'Channel', functionName: 'channels', required: true, type: 'asyncSelect' }],
  },
  dribbble: {
    title: 'Dribbble settings',
    fields: [
      { key: 'title', label: 'Title', required: true, type: 'text' },
      { key: 'team', label: 'Team', functionName: 'teams', type: 'asyncSelect' },
    ],
  },
  facebook: {
    title: 'Facebook settings',
    fields: [
      {
        defaultValue: 'post',
        key: 'post_type',
        label: 'Post type',
        options: [
          { label: 'Post', value: 'post' },
          { label: 'Story', value: 'story' },
        ],
        type: 'select',
      },
      { key: 'url', label: 'Embedded URL', type: 'url', visibleWhen: (settings) => settings.post_type !== 'story' },
      {
        key: 'text_format_preset_id',
        label: 'Background preset ID',
        hint: 'Optional Facebook text-only background preset.',
        type: 'text',
        visibleWhen: (settings) => settings.post_type !== 'story',
      },
    ],
  },
  gmb: {
    title: 'Google Business Profile settings',
    fields: [
      {
        defaultValue: 'STANDARD',
        key: 'topicType',
        label: 'Post type',
        options: [
          { label: 'Standard Update', value: 'STANDARD' },
          { label: 'Event', value: 'EVENT' },
          { label: 'Offer', value: 'OFFER' },
        ],
        type: 'select',
      },
      {
        defaultValue: 'NONE',
        key: 'callToActionType',
        label: 'Call to action',
        options: [
          { label: 'None', value: 'NONE' },
          { label: 'Book', value: 'BOOK' },
          { label: 'Order Online', value: 'ORDER' },
          { label: 'Shop', value: 'SHOP' },
          { label: 'Learn More', value: 'LEARN_MORE' },
          { label: 'Sign Up', value: 'SIGN_UP' },
          { label: 'Get Offer', value: 'GET_OFFER' },
          { label: 'Call', value: 'CALL' },
        ],
        type: 'select',
      },
      {
        key: 'callToActionUrl',
        label: 'Call to action URL',
        type: 'url',
        visibleWhen: (settings) =>
          !!settings.callToActionType &&
          settings.callToActionType !== 'NONE' &&
          settings.callToActionType !== 'CALL',
      },
      { key: 'eventTitle', label: 'Event title', type: 'text', visibleWhen: (settings) => settings.topicType === 'EVENT' },
      { key: 'eventStartDate', label: 'Start date', type: 'date', visibleWhen: (settings) => settings.topicType === 'EVENT' },
      { key: 'eventEndDate', label: 'End date', type: 'date', visibleWhen: (settings) => settings.topicType === 'EVENT' },
      { key: 'eventStartTime', label: 'Start time', type: 'time', visibleWhen: (settings) => settings.topicType === 'EVENT' },
      { key: 'eventEndTime', label: 'End time', type: 'time', visibleWhen: (settings) => settings.topicType === 'EVENT' },
      { key: 'offerCouponCode', label: 'Coupon code', type: 'text', visibleWhen: (settings) => settings.topicType === 'OFFER' },
      { key: 'offerRedeemUrl', label: 'Redeem URL', type: 'url', visibleWhen: (settings) => settings.topicType === 'OFFER' },
      { key: 'offerTerms', label: 'Terms and conditions', type: 'multiline', visibleWhen: (settings) => settings.topicType === 'OFFER' },
    ],
  },
  hashnode: {
    title: 'Hashnode settings',
    fields: [
      { key: 'title', label: 'Title', required: true, type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'canonical', label: 'Canonical link', type: 'url' },
      { key: 'main_image', label: 'Cover picture', mediaKind: 'image', type: 'media' },
      { key: 'publication', label: 'Publication', functionName: 'publications', required: true, type: 'asyncSelect' },
      { key: 'tags', label: 'Tags', functionName: 'tags', required: true, type: 'asyncMulti' },
    ],
  },
  instagram: {
    title: 'Instagram settings',
    fields: [
      ...instagramFields,
      {
        functionName: 'audioSearch',
        hint: 'Reels only. Search uses the connected Instagram account.',
        key: 'audio',
        label: 'Audio',
        type: 'instagramAudio',
        visibleWhen: (settings) => settings.post_type === 'post',
      },
    ],
  },
  reddit: {
    title: 'Reddit settings',
    fields: [{ key: 'subreddit', label: 'Subreddits', provider: 'reddit', required: true, type: 'communityList' }],
  },
  lemmy: {
    title: 'Lemmy settings',
    fields: [{ key: 'subreddit', label: 'Communities', provider: 'lemmy', required: true, type: 'communityList' }],
  },
  'instagram-standalone': {
    title: 'Instagram settings',
    fields: instagramFields,
  },
  linkedin: {
    title: 'LinkedIn settings',
    fields: [
      { defaultValue: false, key: 'post_as_images_carousel', label: 'Post as image carousel', type: 'boolean' },
      { key: 'carousel_name', label: 'Carousel slide name', type: 'text', visibleWhen: (settings) => settings.post_as_images_carousel === true },
    ],
  },
  'linkedin-page': {
    title: 'LinkedIn Page settings',
    fields: [
      { defaultValue: false, key: 'post_as_images_carousel', label: 'Post as image carousel', type: 'boolean' },
      { key: 'carousel_name', label: 'Carousel slide name', type: 'text', visibleWhen: (settings) => settings.post_as_images_carousel === true },
    ],
  },
  listmonk: {
    title: 'Listmonk settings',
    fields: [
      { key: 'subject', label: 'Subject', required: true, type: 'text' },
      { key: 'preview', label: 'Preview', required: true, type: 'text' },
      { key: 'list', label: 'List', functionName: 'list', required: true, type: 'asyncSelect' },
      { key: 'template', label: 'Template', functionName: 'templates', type: 'asyncSelect' },
    ],
  },
  medium: {
    title: 'Medium settings',
    fields: [
      { key: 'title', label: 'Title', required: true, type: 'text' },
      { key: 'subtitle', label: 'Subtitle', required: true, type: 'text' },
      { key: 'canonical', label: 'Canonical link', type: 'url' },
      { key: 'publication', label: 'Publication', functionName: 'publications', type: 'asyncSelect' },
      { key: 'tags', label: 'Topics', maxItems: 3, type: 'tagInput' },
    ],
  },
  mewe: {
    title: 'MeWe settings',
    fields: [
      {
        defaultValue: 'timeline',
        key: 'postType',
        label: 'Post to',
        options: [
          { label: 'My Timeline', value: 'timeline' },
          { label: 'Group', value: 'group' },
        ],
        required: true,
        type: 'select',
      },
      { key: 'group', label: 'Group', functionName: 'groups', required: true, type: 'asyncSelect', visibleWhen: (settings) => settings.postType === 'group' },
    ],
  },
  moltbook: {
    title: 'Moltbook settings',
    fields: [{ key: 'submolt', label: 'Submolt', required: true, type: 'text' }],
  },
  pinterest: {
    title: 'Pinterest settings',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'link', label: 'Link', type: 'url' },
      { key: 'board', label: 'Board', functionName: 'boards', required: true, type: 'asyncSelect' },
      { key: 'dominant_color', label: 'Pin color', type: 'color' },
    ],
  },
  skool: {
    title: 'Skool settings',
    fields: [
      { key: 'title', label: 'Title', required: true, type: 'text' },
      { key: 'group', label: 'Group', functionName: 'groups', required: true, type: 'asyncSelect' },
      { key: 'label', label: 'Label', functionName: 'label', params: (settings) => ({ id: settings.group }), required: true, type: 'asyncSelect' },
    ],
  },
  slack: {
    title: 'Slack settings',
    fields: [{ key: 'channel', label: 'Channel', functionName: 'channels', required: true, type: 'asyncSelect' }],
  },
  tiktok: {
    title: 'TikTok settings',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        defaultValue: 'PUBLIC_TO_EVERYONE',
        key: 'privacy_level',
        label: 'Who can see this video?',
        options: [
          { label: 'Public to everyone', value: 'PUBLIC_TO_EVERYONE' },
          { label: 'Mutual follow friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
          { label: 'Follower of creator', value: 'FOLLOWER_OF_CREATOR' },
          { label: 'Self only', value: 'SELF_ONLY' },
        ],
        required: true,
        type: 'select',
      },
      {
        defaultValue: 'DIRECT_POST',
        key: 'content_posting_method',
        label: 'Content posting method',
        options: [
          { label: 'Post directly to TikTok', value: 'DIRECT_POST' },
          { label: 'Upload without posting', value: 'UPLOAD' },
        ],
        required: true,
        type: 'select',
      },
      { defaultValue: 'no', key: 'autoAddMusic', label: 'Auto add music', options: yesNo, required: true, type: 'select' },
      { defaultValue: true, key: 'comment', label: 'Allow comments', type: 'boolean' },
      { defaultValue: false, key: 'duet', label: 'Allow duet', type: 'boolean' },
      { defaultValue: false, key: 'stitch', label: 'Allow stitch', type: 'boolean' },
      { defaultValue: false, key: 'video_made_with_ai', label: 'Video made with AI', type: 'boolean' },
      { defaultValue: false, key: 'disclose', label: 'Disclose promotional content', type: 'boolean' },
      { defaultValue: false, key: 'brand_organic_toggle', label: 'Your brand', type: 'boolean', visibleWhen: (settings) => settings.disclose === true },
      { defaultValue: false, key: 'brand_content_toggle', label: 'Branded content', type: 'boolean', visibleWhen: (settings) => settings.disclose === true },
    ],
  },
  tumblr: {
    title: 'Tumblr settings',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'link', label: 'Link URL', type: 'url' },
      { key: 'sourceUrl', label: 'Source URL', type: 'url' },
      { key: 'tags', label: 'Tags', type: 'text' },
    ],
  },
  twitch: {
    title: 'Twitch settings',
    fields: [
      {
        defaultValue: 'message',
        key: 'messageType',
        label: 'Message type',
        options: [
          { label: 'Message', value: 'message' },
          { label: 'Announcement', value: 'announcement' },
        ],
        type: 'select',
      },
      {
        defaultValue: 'primary',
        key: 'announcementColor',
        label: 'Announcement color',
        options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Blue', value: 'blue' },
          { label: 'Green', value: 'green' },
          { label: 'Orange', value: 'orange' },
          { label: 'Purple', value: 'purple' },
        ],
        type: 'select',
        visibleWhen: (settings) => settings.messageType === 'announcement',
      },
    ],
  },
  whop: {
    title: 'Whop settings',
    fields: [
      { key: 'company', label: 'Company', functionName: 'companies', required: true, type: 'asyncSelect' },
      { key: 'experience', label: 'Experience', functionName: 'experiences', params: (settings) => ({ companyId: settings.company }), required: true, type: 'asyncSelect' },
      { key: 'title', label: 'Title', type: 'text' },
    ],
  },
  wrapcast: {
    title: 'Warpcast settings',
    fields: [{ key: 'subreddit', label: 'Channels', provider: 'wrapcast', required: true, type: 'communityList' }],
  },
  wordpress: {
    title: 'WordPress settings',
    fields: [
      { key: 'title', label: 'Title', required: true, type: 'text' },
      { key: 'type', label: 'Type', functionName: 'postTypes', required: true, type: 'asyncSelect' },
      {
        defaultValue: 'publish',
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Publish', value: 'publish' },
          { label: 'Draft', value: 'draft' },
          { label: 'Pending', value: 'pending' },
          { label: 'Private', value: 'private' },
        ],
        type: 'select',
      },
      { key: 'categories', label: 'Categories', functionName: 'categoriesList', type: 'asyncMulti', valueMode: 'number' },
      { key: 'tags', label: 'WordPress Tags', functionName: 'tagsList', type: 'asyncMulti', valueMode: 'number' },
      { key: 'main_image', label: 'Cover picture', mediaKind: 'image', type: 'media' },
    ],
  },
  x: {
    title: 'X settings',
    fields: [
      {
        defaultValue: 'everyone',
        key: 'who_can_reply_post',
        label: 'Who can reply?',
        options: [
          { label: 'Everyone', value: 'everyone' },
          { label: 'Accounts you follow', value: 'following' },
          { label: 'Mentioned accounts', value: 'mentionedUsers' },
          { label: 'Subscribers', value: 'subscribers' },
          { label: 'Verified accounts', value: 'verified' },
        ],
        type: 'select',
      },
      { key: 'community', label: 'Community URL', type: 'url' },
      { key: 'made_with_ai', label: 'Made with AI', type: 'boolean' },
      { key: 'paid_partnership', label: 'Paid partnership', type: 'boolean' },
      ...threadFinisherFields,
    ],
  },
  youtube: {
    title: 'YouTube settings',
    fields: [
      { key: 'title', label: 'Title', required: true, type: 'text' },
      {
        defaultValue: 'public',
        key: 'type',
        label: 'Visibility',
        options: [
          { label: 'Public', value: 'public' },
          { label: 'Private', value: 'private' },
          { label: 'Unlisted', value: 'unlisted' },
        ],
        required: true,
        type: 'select',
      },
      { defaultValue: 'no', key: 'selfDeclaredMadeForKids', label: 'Made for kids', options: yesNo, type: 'select' },
      { key: 'tags', label: 'Tags', maxItems: 12, type: 'tagInput' },
      { key: 'thumbnail', label: 'Thumbnail', mediaKind: 'image', type: 'media' },
    ],
  },
  bluesky: {
    title: 'Bluesky settings',
    fields: threadFinisherFields,
  },
  kick: empty,
  mastodon: empty,
  nostr: empty,
  telegram: empty,
  threads: {
    title: 'Threads settings',
    fields: threadFinisherFields,
  },
  vk: empty,
};

export function getProviderSettingsConfig(identifier?: string | null) {
  return identifier ? providerSettingsRegistry[identifier] ?? empty : empty;
}

export function getDefaultProviderSettings(identifier: string) {
  const config = getProviderSettingsConfig(identifier);
  return config.fields.reduce<Record<string, unknown>>(
    (acc, field) =>
      field.defaultValue === undefined ? acc : { ...acc, [field.key]: field.defaultValue },
    { __type: identifier }
  );
}

export function sanitizeProviderSettings(identifier: string, values?: Record<string, unknown>) {
  const config = getProviderSettingsConfig(identifier);
  const output: Record<string, unknown> = {
    ...getDefaultProviderSettings(identifier),
    ...(values ?? {}),
    __type: identifier,
  };

  Object.keys(output).forEach((key) => {
    const value = output[key];
    const field = config.fields.find((item) => item.key === key);

    if (value === undefined || value === null || value === '') {
      delete output[key];
      return;
    }

    if (Array.isArray(value) && value.length === 0) {
      delete output[key];
      return;
    }

    if (field?.type === 'communityList' && Array.isArray(value)) {
      const filtered = value.filter((item) => {
        const record = item && typeof item === 'object' ? (item as { value?: Record<string, unknown> }).value : undefined;
        return !!(record?.subreddit || record?.id);
      });

      if (!filtered.length) {
        delete output[key];
        return;
      }

      output[key] = filtered;
    }
  });

  return output;
}

export function validateProviderSettings(identifier: string, values?: Record<string, unknown>) {
  const config = getProviderSettingsConfig(identifier);
  const settings = { ...getDefaultProviderSettings(identifier), ...(values ?? {}) };

  for (const field of config.fields) {
    if (field.visibleWhen && !field.visibleWhen(settings)) {
      continue;
    }

    const value = settings[field.key];

    if (
      field.required &&
      (value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0))
    ) {
      return `${field.label} is required.`;
    }

    if (field.type === 'communityList' && Array.isArray(value)) {
      const missing = value.find((item) => {
        const record = item && typeof item === 'object' ? (item as { value?: Record<string, unknown> }).value : undefined;

        if (!record) {
          return true;
        }

        if (field.provider === 'wrapcast') {
          return !record.id;
        }

        if (!record.subreddit || !record.title) {
          return true;
        }

        if (field.provider === 'reddit' && !record.type) {
          return true;
        }

        if (field.provider === 'reddit' && record.type === 'link' && !record.url) {
          return true;
        }

        return false;
      });

      if (missing) {
        return `${field.label} has an incomplete entry.`;
      }
    }
  }

  return null;
}

export function normalizeProviderOption(item: unknown): ProviderOption | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const value = record.value ?? record.id ?? record.name ?? record.label;
  const label = record.label ?? record.name ?? record.title ?? record.value ?? record.id;

  if (value === undefined || label === undefined) {
    return null;
  }

  return { label: String(label), value: typeof value === 'number' ? value : String(value) };
}
