import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';

export const dynamic = 'force-dynamic';
import '../global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import '@copilotkit/react-ui/styles.css';
import LayoutContext from '@gitroom/frontend/components/layout/layout.context';
import { Metadata } from 'next';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { VariableContextComponent } from '@gitroom/react/helpers/variable.context';
import UtmSaver from '@gitroom/helpers/utils/utm.saver';
import { fontClassName } from '../fonts';
import { cookies } from 'next/headers';
import {
  resolveTheme,
  THEME_COOKIE,
} from '@gitroom/frontend/components/layout/theme';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { isAiEnabled } from '@gitroom/helpers/utils/ai.enabled';
import { areCookiesSecured } from '@gitroom/helpers/utils/cookies.secured';

export const metadata: Metadata = {
  title: {
    default: 'PostQueen',
    template: '%s · PostQueen',
  },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const mode = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html>
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body
        className={clsx(fontClassName, mode, 'text-primary !bg-primary')}
      >
        <VariableContextComponent
          language="en"
          storageProvider={
            process.env.STORAGE_PROVIDER! as 'local' | 'cloudflare'
          }
          uploadViaServer={process.env.UPLOAD_VIA_SERVER === 'true'}
          stripeClient=""
          environment={process.env.NODE_ENV!}
          backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
          plontoKey={process.env.NEXT_PUBLIC_POLOTNO!}
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
          dub={false}
          facebookPixel={process.env.NEXT_PUBLIC_FACEBOOK_PIXEL!}
          telegramBotName={process.env.TELEGRAM_BOT_NAME!}
          neynarClientId={process.env.NEYNAR_CLIENT_ID!}
          isSecured={areCookiesSecured()}
          isChatBase={false}
          chatbaseBotId={''}
          onboardingVideoUrl={''}
          repositoryUrl={''}
          disableImageCompression={!!process.env.DISABLE_IMAGE_COMPRESSION}
          disableXAnalytics={!!process.env.DISABLE_X_ANALYTICS}
          sentryDsn={process.env.NEXT_PUBLIC_SENTRY_DSN!}
          extensionId={process.env.EXTENSION_ID || ''}
          extensionStoreUrl={process.env.EXTENSION_STORE_URL || ''}
          transloadit={
            process.env.TRANSLOADIT_AUTH && process.env.TRANSLOADIT_TEMPLATE
              ? [
                  process.env.TRANSLOADIT_AUTH!,
                  process.env.TRANSLOADIT_TEMPLATE!,
                ]
              : []
          }
        >
          <MantineWrapper>
            <LayoutContext>
              <UtmSaver />
              {children}
            </LayoutContext>
          </MantineWrapper>
        </VariableContextComponent>
      </body>
    </html>
  );
}
