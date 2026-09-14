'use client';

import {
  FC,
  PointerEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSentryFeedback } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import {
  useHasPublishedPost,
  useTour,
} from '@gitroom/frontend/components/onboarding/tour';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { MobileSheet } from '@gitroom/frontend/components/layout/mobile-sheet';

const HelpIcon: FC<{ d: string }> = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ROW =
  'flex w-full items-center gap-[10px] rounded-pqSm px-[10px] py-[8px] text-start text-[13.5px] transition-colors';
const ROW_INK = 'text-pqMuted hover:bg-pqHover hover:text-pqText';

const ICON_TOUR = 'M9 11.5l2.5 2.5L17 8.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z';
const ICON_DOCS =
  'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z';
const ICON_SUPPORT =
  'M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z';
const ICON_BUG = 'M12 8v4M12 15.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z';
const ICON_EXTENSION =
  'M11.5 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 0h9.17M3.45 5.06 8.04 13M10.38 20.94 14.96 13M21.5 11a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z';
const ICON_CHANGELOG =
  'M12 7v5l3 2M3.05 11a9 9 0 1 1 .5 4M3 21v-6h6';
const ICON_COMMUNITY =
  'M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75';

/**
 * The header's Help menu.
 *
 * App chrome: Take a tour · Documentation · Contact support · Report a bug ·
 * (What's new / Community / Browser extension when configured). Opens on
 * hover, not on click.
 *
 * Checkout (`surface="checkout"`): no tour — there is nothing to tour from the
 * paywall. Same support and bug rows as the app menu.
 *
 * Contact support and Report a bug are reachable whenever there is somewhere
 * to send them. Chatbase and Sentry are the richer paths, but both are
 * optional per deployment and a menu whose only working row is Documentation
 * is not a help menu — so each falls back to a pre-filled mail draft carrying
 * the build and the page it was sent from. The draft needs a support address
 * (SUPPORT_EMAIL, or ours on the hosted service); a self-hosted instance
 * without one shows neither mail row rather than mailing its reports to us.
 */
export const HelpMenu: FC<{ surface?: 'app' | 'checkout' }> = ({
  surface = 'app',
}) => {
  const t = useT();
  const { touch } = useViewport();
  const {
    isChatBase,
    extensionStoreUrl,
    billingEnabled,
    supportEmail,
    changelogUrl,
    communityUrl,
  } = useVariables();
  const sentry = useSentryFeedback();
  const { start: startTour } = useTour();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(open, 'end');
  const isCheckout = surface === 'checkout';

  // The tour row retires itself once the account has published something. Read
  // at mount rather than on open so the row is never drawn and then pulled out
  // from under the cursor; `!== true` keeps it visible while the answer is in
  // flight and if the request fails.
  const hasPublished = useHasPublishedPost(!isCheckout);
  const showTour = !isCheckout && hasPublished !== true;

  const version = process.env.NEXT_PUBLIC_APP_VERSION || '';

  useEffect(() => {
    if (!open || touch) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, touch]);

  // Hovering opens it. Everything in here is one click deep, so making people
  // click the trigger first only added a step — and the tooltip that used to
  // greet the cursor said "Help & resources" over a button already labelled
  // Help, while covering the menu it was describing.
  //
  // `pointerType` gates this to a real mouse. Touch has no hover, and a tap
  // fires pointerenter immediately before click, so without the gate the menu
  // would open and the click would close it again.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // The panel is positioned 6px below the trigger, so the cursor leaves the
  // wrapper while crossing that gap. The delay is what carries it across —
  // without one the menu closes on the way in. Entering the panel cancels it:
  // the panel is a child of this wrapper, so it re-enters rather than staying
  // out.
  const hoverOpen = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const hoverClose = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Same condition the standalone icon carried: no listing configured means
  // this deployment has not published an extension. Checkout header has no
  // place for the extension row — keep it on the app chrome only.
  const showExtension = !isCheckout && billingEnabled && !!extensionStoreUrl;
  const row = clsx(
    ROW,
    ROW_INK,
    touch && 'h-[44px] min-h-[44px] px-[12px] text-[15px]'
  );

  // Whoever reads the mail asks for these two first. The signature is appended
  // to both drafts so they arrive with the report instead of a round trip.
  const mailto = useMemo(() => {
    const signature = `\n\n---\nPostQueen${version ? ` v${version}` : ''}\n${t(
      'mail_page',
      'Page'
    )}: ${pathname || '/'}`;
    return (subject: string, body: string) =>
      `mailto:${supportEmail}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(`${body}${signature}`)}`;
  }, [supportEmail, pathname, version, t]);

  const live = (
    onClick: () => void,
    icon: string,
    label: string,
    key: string
  ): ReactNode => (
    <button
      key={key}
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={row}
    >
      <HelpIcon d={icon} />
      {label}
    </button>
  );

  const link = (
    href: string,
    icon: string,
    label: string,
    key: string
  ): ReactNode => (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noreferrer"
      role="menuitem"
      onClick={() => setOpen(false)}
      className={row}
    >
      <HelpIcon d={icon} />
      {label}
    </a>
  );

  // A mail draft opens in the user's client, not a new tab — a `_blank` here
  // leaves an empty window behind on every browser that hands the URL off.
  const mail = (
    href: string,
    icon: string,
    label: string,
    key: string
  ): ReactNode => (
    <a
      key={key}
      href={href}
      role="menuitem"
      onClick={() => setOpen(false)}
      className={row}
    >
      <HelpIcon d={icon} />
      {label}
    </a>
  );

  const helpBody = (
    <>
      {showTour &&
        live(
          () => startTour(),
          ICON_TOUR,
          t('take_a_tour', 'Take a tour'),
          'tour'
        )}

      {link(
        'https://docs.postqueen.ai',
        ICON_DOCS,
        t('documentation', 'Documentation'),
        'docs'
      )}

      {isChatBase
        ? live(
            () => (window as any).chatbase?.('open'),
            ICON_SUPPORT,
            t('contact_support', 'Contact support'),
            'support'
          )
        : !!supportEmail &&
          mail(
            mailto(
              t('support_mail_subject', 'PostQueen support'),
              t(
                'support_mail_body',
                'What do you need help with? Attach a screenshot if you can.'
              )
            ),
            ICON_SUPPORT,
            t('contact_support', 'Contact support'),
            'support'
          )}

      {sentry.enabled ? (
        <button
          ref={sentry.ref}
          type="button"
          role="menuitem"
          onClick={() => setOpen(false)}
          className={row}
        >
          <HelpIcon d={ICON_BUG} />
          {t('report_a_bug', 'Report a bug')}
        </button>
      ) : (
        !!supportEmail &&
        mail(
          mailto(
            t('bug_mail_subject', 'PostQueen bug report'),
            t(
              'bug_mail_body',
              'What happened? What did you expect? Attach a screenshot if you can.'
            )
          ),
          ICON_BUG,
          t('report_a_bug', 'Report a bug'),
          'bug'
        )
      )}

      {!!changelogUrl &&
        link(
          changelogUrl,
          ICON_CHANGELOG,
          t('whats_new', "What's new"),
          'changelog'
        )}

      {!!communityUrl &&
        link(
          communityUrl,
          ICON_COMMUNITY,
          t('community', 'Community'),
          'community'
        )}

      {showExtension &&
        link(
          extensionStoreUrl,
          ICON_EXTENSION,
          t('browser_extension', 'Browser extension'),
          'extension'
        )}
    </>
  );

  return (
    <div
      ref={ref}
      onPointerEnter={hoverOpen}
      onPointerLeave={hoverClose}
      className="relative shrink-0"
    >
      <button
        type="button"
        ref={referenceRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('help', 'Help')}
        className={clsx(
          'rounded-[8px] text-[12.5px] font-[500] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText',
          touch
            ? 'grid size-[44px] place-items-center'
            : 'flex h-[30px] items-center gap-[6px] px-[9px]',
          open && 'bg-pqHover text-pqText'
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span data-hdr-label="1">{t('help', 'Help')}</span>
      </button>

      {touch ? (
        <MobileSheet
          open={open}
          onClose={() => setOpen(false)}
          title={t('help', 'Help')}
        >
          <div role="menu" className="flex flex-col gap-[2px] px-[8px] pb-[4px]">
            {helpBody}
          </div>
        </MobileSheet>
      ) : (
        open && (
        <div
          ref={floatingRef}
          role="menu"
          className="z-[60] w-[246px] animate-pqPop rounded-pqMd border border-pqBorder bg-pqInner p-[6px] shadow-pq"
        >
          {helpBody}
        </div>
        )
      )}
    </div>
  );
};
