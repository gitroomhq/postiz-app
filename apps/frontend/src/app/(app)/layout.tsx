import { SentryComponent } from '@gitroom/frontend/components/layout/sentry.component';

export const dynamic = 'force-dynamic';
import '../global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import '@copilotkit/react-ui/styles.css';
import LayoutContext from '@gitroom/frontend/components/layout/layout.context';
import { Metadata } from 'next';
import { ReactNode } from 'react';
import PlausibleProvider from 'next-plausible';
import clsx from 'clsx';
import { VariableContextComponent } from '@gitroom/react/helpers/variable.context';
import { Fragment } from 'react';
import { PHProvider } from '@gitroom/react/helpers/posthog';
import UtmSaver from '@gitroom/helpers/utils/utm.saver';
import { fontClassName } from '../fonts';
import { DubAnalytics } from '@gitroom/frontend/components/layout/dubAnalytics';
import { FacebookComponent } from '@gitroom/frontend/components/layout/facebook.component';
import { GoogleTagManagerComponent } from '@gitroom/frontend/components/layout/gtm.component';
import { cookies } from 'next/headers';
import {
  cookieName,
  fallbackLng,
} from '@gitroom/react/translation/i18n.config';
import { HtmlComponent } from '@gitroom/frontend/components/layout/html.component';
import Script from 'next/script';
import { ChangeDirClient } from '@gitroom/frontend/components/new-layout/change.dir.client';
import {
  resolveTheme,
  THEME_COOKIE,
} from '@gitroom/frontend/components/layout/theme';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { isAiEnabled } from '@gitroom/helpers/utils/ai.enabled';
import { areCookiesSecured } from '@gitroom/helpers/utils/cookies.secured';

function metadataBaseUrl(): URL {
  try {
    const raw = process.env.FRONTEND_URL || '';
    if (raw) return new URL(raw);
  } catch {
    /* fall through */
  }
  return new URL('https://postqueen.com');
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: 'PostQueen',
    template: '%s · PostQueen',
  },
  description:
    'Schedule and generate posts with AI across 30+ social and chat channels.',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '48x48' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    siteName: 'PostQueen',
    type: 'website',
  },
};

/**
 * Domain reported to the analytics providers. Taken from this deployment rather
 * than hardcoded: with a fixed value, a self-hosted install that configured its
 * own Plausible or DataFast account reported its traffic under the vendor's
 * domain instead of its own.
 */
function analyticsDomain(): string {
  try {
    return new URL(process.env.FRONTEND_URL || '').hostname;
  } catch {
    return '';
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const language = cookieStore.get(cookieName)?.value || fallbackLng;
  const mode = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);
  // Only load Plausible when this deployment has actually configured it.
  // Keying it off the Stripe key meant enabling billing silently started
  // beaconing every visitor to plausible.io.
  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN || '';
  const Plausible = plausibleDomain ? PlausibleProvider : Fragment;
  return (
    <html>
      <head>
        {!!process.env.DATAFAST_WEBSITE_ID && (
          <Script
            data-website-id={process.env.DATAFAST_WEBSITE_ID}
            data-domain={analyticsDomain()}
            src="https://datafa.st/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <ChangeDirClient />
      <body
        className={clsx(fontClassName, mode, 'text-primary !bg-primary')}
      >
        <VariableContextComponent
          storageProvider={
            process.env.STORAGE_PROVIDER! as 'local' | 'cloudflare'
          }
          uploadViaServer={process.env.UPLOAD_VIA_SERVER === 'true'}
          environment={process.env.NODE_ENV!}
          backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
          plontoKey={process.env.NEXT_PUBLIC_POLOTNO!}
          stripeClient={process.env.STRIPE_PUBLISHABLE_KEY!}
          isChatBase={!!process.env.CHATBASE_TOKEN}
          chatbaseBotId={process.env.CHATBASE_BOT_ID || ''}
          onboardingVideoUrl={process.env.ONBOARDING_VIDEO_URL || ''}
          repositoryUrl={process.env.REPOSITORY_URL || ''}
          billingEnabled={isBillingEnabled()}
          aiEnabled={isAiEnabled()}
          passwordlessLogin={process.env.PASSWORDLESS_LOGIN === 'true'}
          turnstileSiteKey={process.env.TURNSTILE_SITE_KEY || ''}
          frontEndUrl={process.env.FRONTEND_URL!}
          legalUrl={process.env.LEGAL_URL || ''}
          affiliateUrl={process.env.AFFILIATE_URL || ''}
          isGeneral={!!process.env.IS_GENERAL}
          genericOauth={!!process.env.POSTQUEEN_GENERIC_OAUTH}
          oauthLogoUrl={process.env.NEXT_PUBLIC_POSTQUEEN_OAUTH_LOGO_URL!}
          oauthDisplayName={process.env.NEXT_PUBLIC_POSTQUEEN_OAUTH_DISPLAY_NAME!}
          uploadDirectory={process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY!}
          cloudflareUrl={process.env.CLOUDFLARE_BUCKET_URL || ''}
          mainUrl={process.env.MAIN_URL || ''}
          mcpUrl={process.env.MCP_URL}
          dub={!!process.env.DUB_PUBLISHABLE_KEY}
          facebookPixel={process.env.NEXT_PUBLIC_FACEBOOK_PIXEL!}
          telegramBotName={process.env.TELEGRAM_BOT_NAME!}
          neynarClientId={process.env.NEYNAR_CLIENT_ID!}
          isSecured={areCookiesSecured()}
          disableImageCompression={!!process.env.DISABLE_IMAGE_COMPRESSION}
          disableXAnalytics={!!process.env.DISABLE_X_ANALYTICS}
          sentryDsn={process.env.NEXT_PUBLIC_SENTRY_DSN!}
          extensionId={process.env.EXTENSION_ID || ''}
          extensionStoreUrl={process.env.EXTENSION_STORE_URL || ''}
          googleAdsId={process.env.NEXT_PUBLIC_GTM_ID}
          googleAdsTrialTracking={process.env.NEXT_PUBLIC_TRACKING_TRIAL}
          language={language}
          transloadit={
            process.env.TRANSLOADIT_AUTH && process.env.TRANSLOADIT_TEMPLATE
              ? [
                  process.env.TRANSLOADIT_AUTH!,
                  process.env.TRANSLOADIT_TEMPLATE!,
                ]
              : []
          }
        >
          <SentryComponent>
            {/*<SetTimezone />*/}
            <HtmlComponent />
            <DubAnalytics />
            <FacebookComponent />
            <GoogleTagManagerComponent gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
            <Plausible domain={plausibleDomain}>
              <PHProvider
                phkey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
                host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
              >
                <LayoutContext>
                  <UtmSaver />
                  {children}
                </LayoutContext>
              </PHProvider>
            </Plausible>
          </SentryComponent>
        </VariableContextComponent>
      </body>
    </html>
  );
}
