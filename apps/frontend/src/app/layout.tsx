import interClass from '@gitroom/react/helpers/inter.font';
export const dynamic = 'force-dynamic';
import './global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import '@copilotkit/react-ui/styles.css';

import LayoutContext from '@gitroom/frontend/components/layout/layout.context';
import { ReactNode } from 'react';
import { Chakra_Petch } from 'next/font/google';
import { isGeneral } from '@gitroom/react/helpers/is.general';
import PlausibleProvider from 'next-plausible';
import clsx from 'clsx';

const chakra = Chakra_Petch({ weight: '400', subsets: ['latin'] });

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
      <body className={clsx(chakra.className, 'text-primary dark')}>
        <PlausibleProvider domain={isGeneral() ? "postiz.com" : "gitroom.com"}>
          <LayoutContext>{children}</LayoutContext>
        </PlausibleProvider>
      </body>
    </html>
  );
}
