import interClass from '@chaolaolo/react/helpers/inter.font';
export const dynamic = 'force-dynamic';
import '../global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import '@copilotkit/react-ui/styles.css';
import LayoutContext from '@chaolaolo/frontend/components/layout/layout.context';
import { ReactNode } from 'react';
import { Chakra_Petch } from 'next/font/google';
import PlausibleProvider from 'next-plausible';
import clsx from 'clsx';
import { VariableContextComponent } from '@chaolaolo/react/helpers/variable.context';
import { Fragment } from 'react';
import { PHProvider } from '@chaolaolo/react/helpers/posthog';
import UtmSaver from '@chaolaolo/helpers/utils/utm.saver';
import { ToltScript } from '@chaolaolo/frontend/components/layout/tolt.script';
import { FacebookComponent } from '@chaolaolo/frontend/components/layout/facebook.component';
import { headers } from 'next/headers';
import { headerName } from '@chaolaolo/react/translation/i18n.config';
import { HtmlComponent } from '@chaolaolo/frontend/components/layout/html.component';

const chakra = Chakra_Petch({
  weight: '400',
  subsets: ['latin'],
});
export default async function AppLayout({ children }: { children: ReactNode }) {
  const allHeaders = headers();
  const Plausible = !!process.env.STRIPE_PUBLISHABLE_KEY
    ? PlausibleProvider
    : Fragment;
  return (
    <html className={interClass}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={clsx(chakra.className, 'dark text-primary !bg-primary')}>
        <HtmlComponent />
        <VariableContextComponent
          storageProvider={
            process.env.STORAGE_PROVIDER! as 'local' | 'cloudflare'
          }
          backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
          plontoKey={process.env.NEXT_PUBLIC_POLOTNO!}
          billingEnabled={!!process.env.STRIPE_PUBLISHABLE_KEY}
          discordUrl={process.env.NEXT_PUBLIC_DISCORD_SUPPORT!}
          frontEndUrl={process.env.FRONTEND_URL!}
          isGeneral={!!process.env.IS_GENERAL}
          genericOauth={!!process.env.POSTIZ_GENERIC_OAUTH}
          oauthLogoUrl={process.env.NEXT_PUBLIC_POSTIZ_OAUTH_LOGO_URL!}
          oauthDisplayName={process.env.NEXT_PUBLIC_POSTIZ_OAUTH_DISPLAY_NAME!}
          uploadDirectory={process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY!}
          tolt={process.env.NEXT_PUBLIC_TOLT!}
          facebookPixel={process.env.NEXT_PUBLIC_FACEBOOK_PIXEL!}
          telegramBotName={process.env.TELEGRAM_BOT_NAME!}
          neynarClientId={process.env.NEYNAR_CLIENT_ID!}
          isSecured={!process.env.NOT_SECURED}
          disableImageCompression={!!process.env.DISABLE_IMAGE_COMPRESSION}
          language={allHeaders.get(headerName)}
        >
          <ToltScript />
          <FacebookComponent />
          <Plausible
            domain={!!process.env.IS_GENERAL ? 'postiz.com' : 'gitroom.com'}
          >
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
        </VariableContextComponent>
      </body>
    </html>
  );
}
