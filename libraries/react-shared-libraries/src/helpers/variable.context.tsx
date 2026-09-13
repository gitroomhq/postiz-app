'use client';

import { createContext, FC, ReactNode, useContext, useEffect } from 'react';
interface VariableContextInterface {
  stripeClient: string;
  billingEnabled: boolean;
  /** OpenAI key present — CopilotKit and CopilotTextarea are safe to mount. */
  aiEnabled: boolean;
  /**
   * Mail can actually be delivered. `/auth/forgot` always answers success so it
   * cannot be used to discover which addresses are registered, which means the
   * screen can never learn from the response that nothing was sent — so the
   * offer has to be withheld up front instead.
   */
  emailEnabled: boolean;
  passwordlessLogin: boolean;
  /** Solana wallet sign-in. Separate from billing; off unless WALLET_LOGIN. */
  walletLogin: boolean;
  turnstileSiteKey: string;
  isChatBase: boolean;
  /** Chatbase bot this deployment owns; the SSO token is signed against it. */
  chatbaseBotId: string;
  onboardingVideoUrl: string;
  repositoryUrl: string;
  /** Store listing for this deployment's own browser extension build. */
  extensionStoreUrl: string;
  isGeneral: boolean;
  genericOauth: boolean;
  oauthLogoUrl: string;
  oauthDisplayName: string;
  mcpUrl?: string;
  cloudflareUrl: string;
  mainUrl: string;
  frontEndUrl: string;
  /**
   * Where this deployment publishes its Terms and Privacy pages. Separate
   * from frontEndUrl because the app and the marketing site can live on
   * different hosts; falls back to frontEndUrl when unset.
   */
  legalUrl: string;
  /**
   * Affiliate programme of whoever runs this install. Read here rather than
   * from process.env in the menu: NEXT_PUBLIC_* is inlined when the image is
   * built, so a client component could never see a runtime value.
   */
  affiliateUrl: string;
  /**
   * Inbox behind the Help menu's Contact support and Report a bug rows.
   *
   * Chatbase and Sentry are the richer paths, but both are optional and a
   * deployment with neither still has to leave a way to reach a human — so
   * this one has a default rather than hiding its rows when unset. Whoever
   * runs the install should point it at their own inbox.
   */
  supportEmail: string;
  /** Release notes, if this deployment publishes any. Unset hides the row. */
  changelogUrl: string;
  /** Community/chat invite, if one exists. Unset hides the row. */
  communityUrl: string;
  plontoKey: string;
  storageProvider: 'local' | 'cloudflare';
  /**
   * Post files to the backend and let it write them to storage, instead of
   * having the browser upload to the bucket directly with a presigned URL.
   * Direct uploads are faster but fragile: anything that rewrites the request
   * on its way out — a privacy extension trimming query parameters, a corporate
   * proxy — invalidates the signature, and the browser reports the resulting
   * rejection as a CORS error that says nothing about the cause.
   */
  uploadViaServer: boolean;
  backendUrl: string;
  environment: string;
  uploadDirectory: string;
  facebookPixel: string;
  telegramBotName: string;
  neynarClientId: string;
  appleClientId: string;
  isSecured: boolean;
  disableImageCompression: boolean;
  disableXAnalytics: boolean;
  language: string;
  dub: boolean;
  transloadit: string[];
  sentryDsn: string;
  extensionId: string;
  googleAdsId?: string;
  googleAdsTrialTracking?: string;
}
const VariableContext = createContext({
  stripeClient: '',
  billingEnabled: false,
  aiEnabled: false,
  emailEnabled: false,
  passwordlessLogin: false,
  walletLogin: false,
  turnstileSiteKey: '',
  isGeneral: true,
  genericOauth: false,
  isChatBase: false,
  chatbaseBotId: '',
  onboardingVideoUrl: '',
  repositoryUrl: '',
  extensionStoreUrl: '',
  oauthLogoUrl: '',
  googleAdsId: '',
  googleAdsTrialTracking: '',
  oauthDisplayName: '',
  mcpUrl: '',
  cloudflareUrl: '',
  mainUrl: '',
  frontEndUrl: '',
  legalUrl: '',
  affiliateUrl: '',
  supportEmail: '',
  changelogUrl: '',
  communityUrl: '',
  storageProvider: 'local',
  uploadViaServer: false,
  plontoKey: '',
  backendUrl: '',
  uploadDirectory: '',
  isSecured: false,
  telegramBotName: '',
  facebookPixel: '',
  neynarClientId: '',
  appleClientId: '',
  disableImageCompression: false,
  disableXAnalytics: false,
  language: '',
  dub: false,
  transloadit: [],
  sentryDsn: '',
  extensionId: '',
} as VariableContextInterface);
export const VariableContextComponent: FC<
  VariableContextInterface & {
    children: ReactNode;
  }
> = (props) => {
  const { children, ...otherProps } = props;
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.vars = otherProps;
    }
  }, []);
  return (
    <VariableContext.Provider value={otherProps}>
      {children}
    </VariableContext.Provider>
  );
};
export const useVariables = () => {
  return useContext(VariableContext);
};
export const loadVars = () => {
  // @ts-ignore
  return window.vars as VariableContextInterface;
};
