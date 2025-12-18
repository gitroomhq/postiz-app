import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import Image from 'next/image';
import loadDynamic from 'next/dynamic';
import { Testimonial } from '@gitroom/frontend/components/auth/testimonial';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <div className="bg-[#0E0E0E] flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-white">
      <style>{`html, body {overflow-x: hidden;}`}</style>
      <ReturnUrlComponent />
      <div className="flex flex-col py-[40px] px-[20px] w-[600px] rounded-[12px] text-white p-[12px] bg-[#1A1919]">
        <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col">
          <Image width={100} height={33} src="/logo-text.svg" alt="Postiz" />
          <div className="flex">{children}</div>
        </div>
      </div>
      <div className="text-[36px] flex-1 pt-[88px] flex flex-col items-center">
        <div className="text-center">
          Over <span className="text-[42px] text-[#FC69FF]">18,000+</span>{' '}
          Entrepreneurs use<br />Postiz
          To Grow Their Social Presence
        </div>
        <div className="flex-1 relative w-full mt-[30px] overflow-hidden">
          <div className="absolute gap-[12px] w-full h-full left-0 top-0 overflow-hidden flex justify-center px-[40px]">
            <div className="absolute w-full h-[120px] left-0 top-0 blackGradTopBg z-[100]" />
            <div className="absolute w-full h-[120px] left-0 bottom-0 blackGradBottomBg z-[100]" />
            <div className="flex flex-col h-full animate-marqueeUp gap-[12px] flex-1">
              {[1, 2].map((p) => (
                <div key={p} className="flex flex-col gap-[12px]">
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                </div>
              ))}
            </div>
            <div className="flex flex-col h-full animate-marqueeDown gap-[12px] flex-1">
              {[1, 2].map((p) => (
                <div key={p} className="flex flex-col gap-[12px]">
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                  <Testimonial />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
