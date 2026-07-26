export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import {
  AuthFooter,
  AuthNav,
} from '@gitroom/frontend/components/auth/auth-chrome';
import { ProductShowcase } from '@gitroom/frontend/components/auth/product-showcase';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

/**
 * Split screen: the form on a plain surface at the start edge, the product
 * still on a brand panel filling the rest. Both halves run to the edge of the
 * viewport — the card-on-a-tinted-page framing the rest of the app uses would
 * only shrink the one thing this page is here to show.
 *
 * Below `lg` the panel drops out entirely and the form takes the full width.
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-newBgColorInner text-newTextColor flex min-h-screen w-full">
      <ReturnUrlComponent />
      <div className="flex flex-1 flex-col px-[24px] py-[28px] sm:px-[40px] lg:w-[46%] lg:max-w-[640px] lg:flex-none">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
          <AuthNav />
          <div className="flex flex-1 flex-col justify-center py-[40px]">
            <div className="flex w-full">{children}</div>
          </div>
          <AuthFooter year={new Date().getFullYear()} />
        </div>
      </div>
      <ProductShowcase />
    </div>
  );
}
