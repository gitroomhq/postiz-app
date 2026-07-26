'use client';

// The right half of the auth split-screen: the product still that ships in the
// README (.github/assets/calendar.svg, copied to public/auth/calendar.svg) on a
// brand gradient, so the first thing a new account sees is the calendar it is
// signing up for. Sample data only; no metrics or claims.
//
// This replaced a hand-built React calendar. The still is the same artwork the
// README and the marketing site use, which keeps one picture of the product
// instead of three that drift apart.

import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * A sample of what the app publishes to, drawn from the icons already in
 * public/icons/platforms. Ten fit on one row at every width the panel appears
 * at; the caption carries the real number.
 */
const CHANNELS = [
  'instagram',
  'x',
  'linkedin',
  'youtube',
  'tiktok',
  'facebook',
  'threads',
  'pinterest',
  'reddit',
  'discord',
];

export const ProductShowcase = () => {
  const t = useT();

  return (
    <aside className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
      {/* Brand wash. Inline rather than an arbitrary Tailwind value: the colour
          stops read better here than escaped inside a class name. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(115% 85% at 12% 0%, #8b5cf6 0%, #6d28d9 30%, #3d1a7a 62%, #1c0e37 100%)',
        }}
      />

      {/* The only texture on the panel: a grid tilted off-axis so it reads as
          depth behind the card rather than as a second table next to it. */}
      <div
        aria-hidden="true"
        className="absolute inset-[-30%] opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          transform: 'rotate(-14deg)',
        }}
      />

      <div className="relative flex w-full max-w-[760px] flex-col items-center gap-[36px] px-[40px] py-[48px] text-white">
        <div className="text-center">
          {/* text-balance so the narrowest panel width does not leave "AI"
              alone on its own line */}
          <h2 className="font-display text-balance text-[28px] font-[700] leading-[1.25] -tracking-[0.6px] xl:text-[32px]">
            {t('auth_showcase_title', 'Schedule and generate posts with AI')}
          </h2>
          <p className="mx-auto mt-[12px] max-w-[440px] text-[15px] leading-[1.6] text-white/70">
            {t(
              'auth_showcase_body',
              'Plan your whole week in one place, let AI draft what goes out, and drag any post to a better time.'
            )}
          </p>
        </div>

        <img
          src="/auth/calendar.svg"
          width={660}
          height={430}
          alt={t(
            'auth_showcase_alt',
            'A week of scheduled posts in the PostQueen calendar'
          )}
          className="w-full max-w-[660px] drop-shadow-[0_28px_60px_rgba(12,6,32,0.55)]"
        />

        <div className="flex flex-col items-center gap-[14px]">
          <div className="flex items-center gap-[10px]">
            {CHANNELS.map((channel) => (
              <img
                key={channel}
                src={`/icons/platforms/${channel}.png`}
                alt=""
                aria-hidden="true"
                className="size-[30px] rounded-full ring-1 ring-inset ring-white/25"
              />
            ))}
          </div>
          <p className="text-[13px] text-white/60">
            {t(
              'auth_showcase_channels',
              'One calendar for the 30+ channels you publish to.'
            )}
          </p>
        </div>
      </div>
    </aside>
  );
};
