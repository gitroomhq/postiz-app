import interClass from '@gitroom/react/helpers/inter.font';
export const dynamic = 'force-dynamic';
import './global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import '@copilotkit/react-ui/styles.css';
import LayoutContext from '@gitroom/frontend/components/layout/layout.context';
import { ReactNode } from 'react';
import { isGeneral } from '@gitroom/react/helpers/is.general';
import PlausibleProvider from 'next-plausible';
import clsx from 'clsx';
import "@fontsource/chakra-petch";

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html className={interClass}>
      <head>
        <link
          rel="icon"
          href={!isGeneral() ? '/favicon.png' : '/postiz-fav.png'}
          sizes="any"
        />
      </head>
      <body className={clsx('chakra-petch', 'text-primary dark')}>
        <PlausibleProvider domain={isGeneral() ? "postiz.com" : "gitroom.com"}>
          <LayoutContext>{children}</LayoutContext>
        </PlausibleProvider>
      </body>
    </html>
  );
}
