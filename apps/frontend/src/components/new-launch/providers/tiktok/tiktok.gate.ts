// postmonster: TikTok composer gate (PRD 8.2).
// The TikTok settings panel registers what is still missing before publishing
// (TT: "кнопки публикации disabled, пока не выполнены все условия; рядом —
// список того, что осталось заполнить"), and the publish buttons in
// manage.modal read this store. Also holds the TT-17 helper that clears
// TikTok settings when a post is duplicated.

import { create } from 'zustand';

interface TikTokGateState {
  // integration id -> human-readable list of missing items
  blockers: Record<string, string[]>;
  setBlockers: (integrationId: string, items: string[]) => void;
  clear: () => void;
}

export const useTikTokGate = create<TikTokGateState>()((set) => ({
  blockers: {},
  setBlockers: (integrationId, items) =>
    set((state) => ({
      blockers: { ...state.blockers, [integrationId]: items },
    })),
  clear: () => set({ blockers: {} }),
}));

export function tikTokBlockersFor(
  blockers: Record<string, string[]>,
  integrationIds: string[]
): string[] {
  const unique = new Set<string>();
  for (const id of integrationIds) {
    for (const item of blockers[id] || []) {
      unique.add(item);
    }
  }
  return Array.from(unique);
}

// TikTok-native visibility labels (the dropdown shows exactly these).
export function tikTokPrivacyLabel(option: string | undefined): string {
  switch (option) {
    case 'PUBLIC_TO_EVERYONE':
      return 'Everyone';
    case 'MUTUAL_FOLLOW_FRIENDS':
      return 'Friends';
    case 'FOLLOWER_OF_CREATOR':
      return 'Followers';
    case 'SELF_ONLY':
      return 'Only me';
    default:
      return 'Not selected';
  }
}

export interface TikTokPanelState {
  loading: boolean;
  reconnect: boolean;
  canPost: boolean;
  message?: string;
  creator?: {
    creator_avatar_url: string;
    creator_username: string;
    creator_nickname: string;
    privacy_level_options: string[];
    comment_disabled: boolean;
    duet_disabled: boolean;
    stitch_disabled: boolean;
    max_video_post_duration_sec: number;
  } | null;
  hasMedia: boolean;
  isVideo: boolean;
  isPhotoTitle: boolean;
  privacy?: string;
  photoTitle?: string;
  disclose?: boolean;
  brandOrganic?: boolean;
  brandContent?: boolean;
  videoDurationSec?: number;
}

// The list of things still missing before this TikTok post can be published
// (PRD TT-02/03/05/08, TT-22) - the publish buttons stay disabled while it is
// non-empty and the list is shown next to them. Pure function so the rules are
// unit-testable (the DOM layer is covered by the manual browser pass).
export function computeTikTokBlockers(input: TikTokPanelState): string[] {
  const list: string[] = [];
  if (input.loading) {
    list.push('Loading TikTok account info…');
    return list;
  }
  if (input.reconnect) {
    list.push('Reconnect the TikTok channel');
    return list;
  }
  if (!input.canPost) {
    list.push(
      input.message ||
        "This TikTok account can't publish more posts right now. Please try again later."
    );
  }
  if (!input.hasMedia) {
    list.push('Add one video or photos for TikTok');
  }
  if (!input.privacy) {
    list.push('Select who can view this post');
  } else if (
    (input.creator?.privacy_level_options || []).length &&
    (input.creator?.privacy_level_options || []).indexOf(input.privacy) === -1
  ) {
    list.push('The selected privacy option is not available for this account');
  }
  if (input.isPhotoTitle && !input.photoTitle) {
    list.push('Add a title for the photo post');
  }
  if (input.disclose && !input.brandOrganic && !input.brandContent) {
    list.push(
      'Indicate if your content promotes yourself, a third party, or both'
    );
  }
  if (input.brandContent && input.privacy === 'SELF_ONLY') {
    list.push('Branded content visibility cannot be set to private.');
  }
  if (
    input.isVideo &&
    typeof input.videoDurationSec === 'number' &&
    input.creator?.max_video_post_duration_sec &&
    input.videoDurationSec > input.creator.max_video_post_duration_sec
  ) {
    list.push(
      `This video is longer than the maximum duration allowed for this TikTok account (${input.creator.max_video_post_duration_sec} s).`
    );
  }
  return list;
}

// TT-10 (variant B): when Branded content is chosen while visibility is
// private, visibility switches to the most open available option and the user
// is told. Returns the next privacy value, or null when nothing should change.
export function resolveBrandedPrivacySwitch(
  privacy: string | undefined,
  brandContent: boolean | undefined,
  options: string[]
): { nextPrivacy: string | null; notice?: string } {
  if (!brandContent || privacy !== 'SELF_ONLY') {
    return { nextPrivacy: null };
  }
  const fallback =
    options.find((p) => p === 'PUBLIC_TO_EVERYONE') ||
    options.find((p) => p !== 'SELF_ONLY');
  if (!fallback) {
    return { nextPrivacy: null };
  }
  return {
    nextPrivacy: fallback,
    notice:
      'Branded content visibility cannot be set to private. Visibility was set to ' +
      tikTokPrivacyLabel(fallback) +
      '.',
  };
}

// TT-17: "Duplicate post" copies text/media but must reset the TikTok
// settings - no privacy or disclosure is carried over, nothing is defaulted
// from the previous post. Other providers keep their settings untouched.
export function stripTikTokSettings(
  settings: any,
  identifier?: string
): any {
  if (
    !settings ||
    typeof settings !== 'object' ||
    !identifier ||
    identifier.indexOf('tiktok') !== 0
  ) {
    return settings;
  }
  const {
    privacy_level,
    disclose,
    brand_content_toggle,
    brand_organic_toggle,
    comment,
    duet,
    stitch,
    videoDurationSec,
    title,
    ...rest
  } = settings;
  return rest;
}
