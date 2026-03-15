export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { TestimonialComponent } from '@gitroom/frontend/components/auth/testimonial.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-screen flex-1 gap-[14px] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.14),transparent_32%),linear-gradient(180deg,#0a0e1a,#0f172a_42%,#111827)] p-[14px] text-white">
      <ReturnUrlComponent />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.06),transparent_20%),radial-gradient(circle_at_80%_80%,rgba(167,139,250,0.08),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.75)_0.6px,transparent_0.6px)] [background-size:18px_18px]" />
      <div className="relative flex flex-1 flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(10,14,26,0.95))] p-[12px] text-white shadow-[0_36px_90px_rgba(2,6,23,0.42)] backdrop-blur-2xl lg:w-[640px] lg:flex-none">
        <div className="mx-auto flex h-full w-full max-w-[460px] flex-col justify-center gap-[22px] px-[14px] py-[42px] text-white">
          <LogoTextComponent />
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.44),rgba(15,23,42,0.78))] p-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
            <div className="flex">{children}</div>
          </div>
        </div>
      </div>
      <div className="relative hidden flex-1 flex-col items-center overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.42),rgba(10,14,26,0.18))] px-[28px] pb-[28px] pt-[72px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(167,139,250,0.12),transparent_38%)]" />
        <div className="pointer-events-none absolute left-[12%] top-[12%] h-[180px] w-[180px] rounded-full bg-[#38bdf8]/10 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[10%] right-[16%] h-[220px] w-[220px] rounded-full bg-[#a78bfa]/12 blur-[120px]" />
        <div className="relative mb-[16px] rounded-full border border-white/10 bg-white/[0.04] px-[14px] py-[6px] text-[11px] font-[700] uppercase tracking-[0.16em] text-white/58">
          Built For Modern Social Teams
        </div>
        <div className="relative max-w-[620px] text-center text-[36px] font-[500] leading-[1.05] tracking-[-0.04em] text-white/92">
          Plan faster, publish cleaner, and keep every channel aligned with
          <br />
          <span className="bg-[linear-gradient(135deg,#38bdf8,#a78bfa)] bg-clip-text text-transparent">
            one premium Postra workspace
          </span>
        </div>
        <p className="relative mt-[18px] max-w-[560px] text-center text-[15px] leading-[1.7] text-slate-300/78">
          Your landing page already feels premium. The product should feel the
          same the moment you log in, so this auth flow now carries the same
          dark glass surfaces, airy spacing, and calm sky-blue accent system.
        </p>
        <TestimonialComponent />
      </div>
    </div>
  );
}
