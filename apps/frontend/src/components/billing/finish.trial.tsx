import React, { FC, useCallback, useEffect, useState } from 'react';
import { mutate } from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * "End the trial now", from wherever it is offered — the Billing screen, the
 * 406 dialog a trial-locked provider raises, and the X panel's own button.
 *
 * The flow is unchanged: POST once, then poll until the organization's trial
 * flag clears. Two things about it are new.
 *
 * The **founding member** case. `billing.controller.ts:79` ends the trial
 * locally when there is no Stripe subscription to end, so this dialog closes
 * for them too — but the only message it had said they had been charged, and
 * nobody charged them. They get their own wording.
 *
 * And "Close window" only appears when there *is* a window to close. Opened
 * from the 406 dialog this dialog lives in a popup, and closing it is the
 * right move; opened from the X panel it is an overlay on the app, where
 * `window.close()` silently does nothing.
 */
export const FinishTrial: FC<{ close: () => void }> = (props) => {
  const [finished, setFinished] = useState(false);
  const fetch = useFetch();
  const user = useUser();
  const t = useT();
  const lifetime = !!user?.isLifetime;

  const finishSubscription = useCallback(async () => {
    await fetch('/billing/finish-trial', {
      method: 'POST',
    });
    checkFinished();
  }, []);

  const checkFinished = useCallback(async () => {
    const { finished } = await (
      await fetch('/billing/is-trial-finished')
    ).json();
    if (!finished) {
      await timer(2000);
      return checkFinished();
    }

    setFinished(true);
  }, []);

  // The surface underneath is usually gated on the organization's trial flag —
  // the X panel that opened this dialog is locked by exactly that, and stays
  // locked until something revalidates the user, which reads as "ending the
  // trial did nothing". It has to happen on the way *out*: revalidating while
  // the dialog is open unmounts the locked panel, and this dialog is rendered
  // inside it, so the thank-you flashed and vanished before it could be read.
  const close = useCallback(() => {
    props.close();
    mutate('/user/self');
  }, [props.close]);

  useEffect(() => {
    finishSubscription();
  }, []);

  const popup = typeof window !== 'undefined' && !!window.opener;

  return (
    <div className="animate-fade fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-[24px]">
      <div className="flex w-full max-w-[520px] flex-col gap-[16px] rounded-pqLg border border-pqBorder bg-pqInner p-[24px] shadow-pq">
        <div className="flex items-start gap-[12px]">
          <div className="flex-1 font-display text-[20px] font-[600] -tracking-[0.01em]">
            {finished
              ? t('trial_ended_title', 'Your trial is over')
              : t('finishing_trial', 'Finishing trial')}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t('close', 'Close')}
            className="grid size-[28px] shrink-0 place-items-center rounded-pqSm text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
          >
            <svg viewBox="0 0 15 15" fill="none" width="15" height="15">
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {!finished ? (
          <div
            data-finish-trial="pending"
            className="flex flex-col items-center gap-[10px] py-[24px]"
          >
            <LoadingComponent height={90} width={90} />
            <div className="text-[13px] text-pqMuted">
              {t('finishing_trial_wait', 'One moment — ending your trial.')}
            </div>
          </div>
        ) : lifetime ? (
          <div data-finish-trial="founder" className="flex flex-col gap-[12px]">
            <span className="w-fit rounded-[6px] bg-pqLtChipBg px-[10px] py-[4px] text-[11px] font-[800] uppercase tracking-[0.05em] text-pqLtAmber">
              {t('founding_member', 'Founding member')}
            </span>
            <div className="text-[13.5px] leading-[1.55] text-pqMuted">
              {t(
                'trial_ended_founder_body',
                'Your trial is over and your founding membership carries on — one payment, already made, with nothing to renew. Thank you for backing PostQueen this early.'
              )}
            </div>
          </div>
        ) : (
          <div data-finish-trial="charged" className="flex flex-col gap-[12px]">
            <div className="text-[13.5px] leading-[1.55] text-pqMuted">
              {t(
                'trial_ended_charged_body',
                'Your trial has been finished and your subscription has been charged.'
              )}
            </div>
          </div>
        )}

        {finished && (
          <div className="flex justify-end gap-[10px]">
            {popup && (
              <button
                type="button"
                onClick={() => window.close()}
                className="h-[38px] rounded-pqSm border border-pqBorder px-[16px] text-[13.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
              >
                {t('close_window', 'Close window')}
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="h-[38px] rounded-pqSm bg-pqBrand px-[18px] text-[13.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
            >
              {t('done', 'Done')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
