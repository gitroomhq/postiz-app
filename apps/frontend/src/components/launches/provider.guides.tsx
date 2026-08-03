'use client';

import { useMemo } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * What to tell somebody before they connect a channel.
 *
 * Written against what each provider actually asks for — the field list came
 * from `GET /integrations` on a running backend, not from the design — and
 * every external fact here was checked at its source. Where a provider needs
 * nothing said beyond "you will be redirected", it gets nothing said: twenty
 * repetitions of the same three sentences is padding, not a guide.
 *
 * `requirement` is the important one. It is the thing that, if you do not know
 * it, makes the connection fail *after* you have already been bounced through
 * somebody else's login — so it is shown before the button, not after.
 */

export interface ProviderGuide {
  /** One sentence. What is about to happen. */
  summary: string;
  /** A precondition that would otherwise fail the connect. */
  requirement?: string;
  /** Only where getting the credential is the hard part. */
  steps?: string[];
  /** Where the credential comes from. */
  link?: { label: string; href: string };
  /** Help for a single custom field, keyed as the field is keyed. */
  fields?: Record<string, string>;
}

export const useProviderGuides = (): {
  guides: Record<string, ProviderGuide>;
  fallback: (name: string) => ProviderGuide;
} => {
  const t = useT();

  return useMemo(() => {
    /* prettier-ignore */
    const guides: Record<string, ProviderGuide> = {
      // ---- OAuth, but with a precondition that will otherwise bite --------
      instagram: {
        summary: t('guide_instagram', 'Connects through Facebook, which is where Instagram keeps its publishing permissions.'),
        requirement: t('guide_instagram_req', 'The account must be a Business or Creator account and linked to a Facebook Page. A personal Instagram account cannot be published to by any tool.'),
      },
      'instagram-standalone': {
        summary: t('guide_instagram_standalone', 'Connects to Instagram directly, without going through a Facebook Page.'),
        requirement: t('guide_instagram_standalone_req', 'Still needs a Business or Creator account.'),
      },
      x: {
        summary: t('guide_x', 'Connects the X account you are currently signed in to.'),
        requirement: t('guide_x_req', 'Switch accounts on X first if you want a different one — this cannot be chosen during the connect.'),
      },
      youtube: {
        summary: t('guide_youtube', 'Connects a YouTube channel through your Google account.'),
        requirement: t('guide_youtube_req', 'The Google account must already own a channel. Google will let you sign in without one and the connect will then have nothing to attach to.'),
      },
      gmb: {
        summary: t('guide_gmb', 'Connects a Google Business Profile location.'),
        requirement: t('guide_gmb_req', 'The location has to be verified. Unverified locations do not accept posts.'),
      },
      tiktok: {
        summary: t('guide_tiktok', 'Connects your TikTok account for scheduled posting.'),
        requirement: t('guide_tiktok_req', 'TikTok reviews new posting apps per account; the first post may need to be made public from the app before scheduling works.'),
      },
      pinterest: {
        summary: t('guide_pinterest', 'Connects Pinterest so posts land on a board you choose.'),
        requirement: t('guide_pinterest_req', 'You need at least one board before anything can be scheduled.'),
      },
      'linkedin-page': {
        summary: t('guide_linkedin_page', 'Connects a LinkedIn company page rather than your personal profile.'),
        requirement: t('guide_linkedin_page_req', 'You must be an admin of the page.'),
      },
      reddit: {
        summary: t('guide_reddit', 'Connects your Reddit account.'),
        requirement: t('guide_reddit_req', 'Each subreddit has its own posting rules and flair requirements — those are chosen per post, not here.'),
      },
      mastodon: {
        summary: t('guide_mastodon', 'Connects a Mastodon account on any instance.'),
      },
      slack: {
        summary: t('guide_slack', 'Posts into a Slack channel you pick during the connect.'),
      },
      discord: {
        summary: t('guide_discord', 'Adds a bot to a Discord server so it can post to a channel there.'),
        requirement: t('guide_discord_req', 'You need Manage Server permission on the server you pick.'),
      },

      // ---- Credentials: getting them is the hard part ---------------------
      bluesky: {
        summary: t('guide_bluesky', 'Bluesky uses an app password — a separate password you create for tools, which you can revoke without changing your own.'),
        requirement: t('guide_bluesky_req', 'Two-factor authentication is not supported yet. If it is on, turn it off before connecting.'),
        steps: [
          t('guide_bluesky_s1', 'Open Bluesky → Settings → App Passwords.'),
          t('guide_bluesky_s2', 'Create one, give it a name you will recognise, and copy it.'),
          t('guide_bluesky_s3', 'Paste your handle and that app password below — not your account password.'),
        ],
        link: { label: t('guide_bluesky_link', 'Bluesky app passwords'), href: 'https://bsky.app/settings/app-passwords' },
        fields: {
          service: t('guide_bluesky_f_service', 'Leave as bsky.social unless you are on your own instance.'),
          identifier: t('guide_bluesky_f_identifier', 'Your handle, for example name.bsky.social'),
          password: t('guide_bluesky_f_password', 'The app password you just created.'),
        },
      },
      devto: {
        summary: t('guide_devto', 'DEV publishes through an API key you generate in your account settings.'),
        steps: [
          t('guide_devto_s1', 'Open DEV → Settings → Extensions.'),
          t('guide_devto_s2', 'Scroll to DEV Community API Keys, name a key and generate it.'),
          t('guide_devto_s3', 'Copy it once — it is not shown again.'),
        ],
        link: { label: t('guide_devto_link', 'DEV API keys'), href: 'https://dev.to/settings/extensions' },
      },
      hashnode: {
        summary: t('guide_hashnode', 'Hashnode publishes through a personal access token.'),
        steps: [
          t('guide_hashnode_s1', 'Open Hashnode → Settings → Developer.'),
          t('guide_hashnode_s2', 'Generate a new token and copy it.'),
        ],
        link: { label: t('guide_hashnode_link', 'Hashnode developer settings'), href: 'https://hashnode.com/settings/developer' },
      },
      medium: {
        summary: t('guide_medium', 'Medium publishes through an integration token from your account settings.'),
        requirement: t('guide_medium_req', 'Medium stopped issuing new integration tokens in January 2025 and no longer allows new integrations. Tokens created before then still work — so if you already have one, paste it. If you have never made one, Medium will not give you one now.'),
        fields: {
          apiKey: t('guide_medium_f_key', 'Your existing Medium integration token.'),
        },
      },
      wordpress: {
        summary: t('guide_wordpress', 'Publishes to a self-hosted WordPress site over its REST API.'),
        requirement: t('guide_wordpress_req', 'Use an application password, not your login password. WordPress will reject the login password.'),
        steps: [
          t('guide_wordpress_s1', 'In WordPress admin, open Users → Profile.'),
          t('guide_wordpress_s2', 'Scroll to Application Passwords, add one and copy the generated value.'),
        ],
        fields: {
          domain: t('guide_wordpress_f_domain', 'The site root, for example https://example.com'),
          username: t('guide_wordpress_f_user', 'Your WordPress username.'),
          password: t('guide_wordpress_f_pass', 'The application password, spaces and all.'),
        },
      },
      listmonk: {
        summary: t('guide_listmonk', 'Sends to a Listmonk mailing list on your own server.'),
        fields: {
          url: t('guide_listmonk_f_url', 'Your Listmonk root URL, for example https://mail.example.com'),
          username: t('guide_listmonk_f_user', 'A Listmonk API user.'),
          password: t('guide_listmonk_f_pass', 'That user\'s API token, from Listmonk → Settings → API users.'),
        },
      },
      lemmy: {
        summary: t('guide_lemmy', 'Posts to communities on a Lemmy instance.'),
        fields: {
          service: t('guide_lemmy_f_service', 'The instance URL, for example https://lemmy.world'),
          identifier: t('guide_lemmy_f_identifier', 'Your username on that instance.'),
          password: t('guide_lemmy_f_password', 'Your Lemmy password.'),
        },
      },
      nostr: {
        summary: t('guide_nostr', 'Signs and broadcasts notes with your Nostr key.'),
        requirement: t('guide_nostr_req', 'The key must be in HEX form. An nsec1… key has to be converted first — a client such as iris.to will show you the hex version.'),
        fields: {
          password: t('guide_nostr_f_key', 'Your private key in HEX. It is stored encrypted, but treat it as you would any key that can post as you.'),
        },
      },

      // ---- Not a normal connect at all ------------------------------------
      telegram: {
        summary: t('guide_telegram', 'Connects a Telegram channel or group through a short code exchange rather than a redirect.'),
        requirement: t('guide_telegram_req', 'Add the bot to the channel and make it an administrator, otherwise it cannot post.'),
      },
      wrapcast: {
        summary: t('guide_wrapcast', 'Connects a Farcaster account by signing with your wallet.'),
        requirement: t('guide_wrapcast_req', 'You will be asked to sign a message. Signing proves the account is yours; it does not move funds.'),
      },
      moltbook: {
        summary: t('guide_moltbook', 'Connects Moltbook by signing with your wallet.'),
        requirement: t('guide_moltbook_req', 'You will be asked to sign a message. Signing proves the account is yours; it does not move funds.'),
      },
      skool: {
        summary: t('guide_skool', 'Skool has no public API, so posting goes through the PostQueen browser extension using your own logged-in session.'),
        requirement: t('guide_skool_req', 'The extension has to be installed and you have to be signed in to Skool in the same browser.'),
      },
      whop: {
        summary: t('guide_whop', 'Posts into Whop forums.'),
      },
    };

    const fallback = (name: string): ProviderGuide => ({
      /* prettier-ignore */
      summary: t('guide_default', 'You will be sent to {{name}} to sign in and approve access. Nothing is posted until you schedule it.', { name }),
    });

    return { guides, fallback };
  }, [t]);
};
