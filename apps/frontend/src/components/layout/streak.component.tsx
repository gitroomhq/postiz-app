'use client';

import { FC, useMemo } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

const FLAME_PATH =
  'M22 15.9998C22 18.9172 20.8411 21.7151 18.7782 23.778C16.7153 25.8409 13.9174 26.9998 11 26.9998C8.08262 26.9998 5.28473 25.8409 3.22183 23.778C1.15893 21.7151 0 18.9172 0 15.9998C0 12.5098 1.375 8.94105 4.0825 5.39355C4.1682 5.28122 4.27674 5.18833 4.40095 5.12099C4.52516 5.05365 4.66223 5.01341 4.80313 5.00289C4.94403 4.99238 5.08556 5.01185 5.21838 5.06001C5.35121 5.10817 5.47233 5.18393 5.57375 5.2823L8.58875 8.20855L11.3388 0.657298C11.3937 0.50669 11.484 0.371499 11.6022 0.263121C11.7203 0.154743 11.8628 0.0763568 12.0175 0.0345691C12.1723 -0.00721869 12.3349 -0.0111825 12.4915 0.023012C12.6481 0.0572064 12.7942 0.128557 12.9175 0.231048C15.6512 2.4998 22 8.56855 22 15.9998Z';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const FlameIcon: FC<{ size?: number; className?: string }> = ({
  size = 13,
  className,
}) => (
  <svg
    viewBox="0 0 22 27"
    width={size}
    height={size}
    fill="currentColor"
    className={clsx('shrink-0', className)}
    aria-hidden="true"
  >
    <path d={FLAME_PATH} />
  </svg>
);

export const StreakComponent: FC = () => {
  const user = useUser();
  const t = useT();

  const streakDays = useMemo(() => {
    if (!user?.streakSince) return 0;
    const streakStart = new Date(user.streakSince);
    const now = new Date();
    const diffTime = now.getTime() - streakStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays + 1 <= 0) {
      return 1;
    }
    return diffDays + 1;
  }, [user?.streakSince]);

  // Continuous streak → Mon–Sun cells for the current week (local). Days in
  // [today-(N-1), today] are done; today gets the design ring. No per-day API.
  const streakWeek = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // JS: Sun=0 … Sat=6 → Mon-first index 0…6
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);

    const earliest =
      streakDays > 0
        ? new Date(today.getTime() - (streakDays - 1) * 86400000)
        : null;

    return DOW.map((dow, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const isToday = day.getTime() === today.getTime();
      const isFuture = day.getTime() > today.getTime();
      const done =
        !!earliest &&
        !isFuture &&
        day.getTime() >= earliest.getTime() &&
        day.getTime() <= today.getTime();
      return { dow, done, isToday };
    });
  }, [streakDays]);

  const hint =
    streakDays <= 0
      ? t('post_today_to_start_your_streak', 'Post today to start your streak!')
      : t(
          'publish_at_least_one_post_today_to_keep_the_streak_alive',
          'Publish at least one post today to keep the streak alive.'
        );

  // Design chrome always draws the streak chip. Hide only on phone via
  // `[data-mobile="1"] [data-streak]` in global.scss.
  // Raise: omit “Longest: N days” — no streakBest in schema.
  return (
    <div data-streak="1" className="relative shrink-0">
      <button
        type="button"
        className="flex h-[30px] cursor-default items-center gap-[5px] rounded-[8px] bg-transparent px-[8px] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
      >
        <FlameIcon className="text-pqStreak" />
        <span className="text-[12.5px] font-[600] -tracking-[0.1px] text-pqText tabular-nums">
          {streakDays}
        </span>
        <span
          data-hdr-label="1"
          className="text-[12.5px] font-[500] -tracking-[0.1px]"
        >
          {t('day_streak', 'day streak')}
        </span>
      </button>

      <div
        data-streak-pop="1"
        className="absolute end-0 top-[36px] z-[60] w-[270px] flex-col gap-[11px] rounded-pqMd border border-pqBorder bg-pqPop p-[14px] shadow-pq animate-pqPop"
      >
        <div className="flex items-center gap-[9px]">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-pqStreakSoft text-pqStreak">
            <FlameIcon size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-[600] text-pqText">
              {t('n_day_posting_streak', '{{count}} day posting streak', {
                count: streakDays,
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-[4px]">
          {streakWeek.map((d, i) => (
            <div
              key={`${d.dow}-${i}`}
              className="flex flex-1 flex-col items-center gap-[5px]"
            >
              <span
                className={clsx(
                  'grid h-[26px] w-full place-items-center rounded-[6px] text-[11px] font-[700]',
                  d.done
                    ? 'bg-pqStreakSoft text-pqStreak'
                    : 'bg-pqSettings text-pqSoft',
                  d.isToday && 'shadow-[inset_0_0_0_1.5px_var(--streak)]'
                )}
              >
                {d.done ? '✓' : ''}
              </span>
              <span className="text-[9.5px] font-[600] tracking-[0.03em] text-pqSoft">
                {d.dow}
              </span>
            </div>
          ))}
        </div>

        <div className="text-[12.5px] leading-[1.55] text-pqMuted">{hint}</div>
      </div>
    </div>
  );
};
