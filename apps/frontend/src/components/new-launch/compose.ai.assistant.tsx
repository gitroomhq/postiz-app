'use client';

import {
  FC,
  ReactNode,
  RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import NextLink from 'next/link';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from '@floating-ui/dom';
import { CopilotPopup, useChatContext } from '@copilotkit/react-ui';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useAiAvailable } from '@gitroom/frontend/components/layout/user.context';
import { CloseIcon } from '@gitroom/frontend/components/ui/icons';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';

const COPILOT_DESKTOP_PX = 640;

const triggerClassName = (open: boolean, touch = false) =>
  clsx(
    'flex shrink-0 items-center gap-[8px] rounded-[10px] border-0 bg-btnSimple px-[16px] text-[14px] font-[600] text-pqText transition-colors hover:bg-pqHover',
    touch ? 'h-[44px] w-full justify-center' : 'h-[42px]',
    open &&
      'bg-pqBrandSoft shadow-[inset_0_0_0_1px_var(--focused)] hover:bg-pqBrandSoft'
  );

const SparkleIcon: FC = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
    className="shrink-0 text-pqFocused"
  >
    <path d="M12 1.8 15.2 8.8 22.2 12 15.2 15.2 12 22.2 8.8 15.2 1.8 12 8.8 8.8Z" />
    <path d="M18.55 2.45 19.75 6.25 23.55 7.45 19.75 8.65 18.55 12.45 17.35 8.65 13.55 7.45 17.35 6.25Z" />
  </svg>
);

const ComposeAiTriggerFace: FC<{
  open: boolean;
  children?: ReactNode;
}> = ({ open, children }) => {
  const t = useT();
  return (
    <>
      {open ? (
        <CloseIcon size={20} className="shrink-0 text-pqFocused" />
      ) : (
        <SparkleIcon />
      )}
      <span>{t('your_assistant', 'AI assistant')}</span>
      {children}
    </>
  );
};

/**
 * CopilotKit's default Button reads open state from chat context, not props.
 */
const ComposeAiPopupButton: FC = () => {
  const t = useT();
  const { touch } = useViewport();
  const { open, setOpen } = useChatContext();
  const label = t('your_assistant', 'AI assistant');
  return (
    <button
      type="button"
      data-pq-compose-ai-trigger
      aria-expanded={open}
      aria-label={label}
      onClick={() => setOpen(!open)}
      className={triggerClassName(open, touch)}
    >
      <ComposeAiTriggerFace open={open} />
    </button>
  );
};

const COPILOT_INSTRUCTIONS = `
You are an assistant that helps the user schedule social media posts.
You can only edit post text in the compose thread. You cannot generate images or video.
Here are the things you can do:
- Add a new comment / post to the list of posts
- Delete a comment / post from the list of posts
- Add content to the comment / post
- Activate or deactivate the comment / post

Post content can be added using the addPostContentFor{num} function.
After using the addPostFor{num} it will create a new addPostContentFor{num+ 1} function.
`;

/**
 * Pin CopilotKit's fixed chat window to the footer trigger. Below CopilotKit's
 * 640px breakpoint the SDK already goes fullscreen — leave that alone.
 */
function usePinCopilotWindow(
  hostRef: RefObject<HTMLElement | null>,
  open: boolean
) {
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!open || !host) {
      return;
    }

    let stop: (() => void) | undefined;

    const attach = () => {
      const floating = host.querySelector(
        '.copilotKitWindow'
      ) as HTMLElement | null;
      if (window.innerWidth < COPILOT_DESKTOP_PX) {
        stop?.();
        stop = undefined;
        if (floating) {
          floating.style.left = '';
          floating.style.top = '';
          floating.style.right = '';
          floating.style.bottom = '';
          floating.style.margin = '';
          floating.style.inset = '';
          floating.style.maxHeight = '';
          floating.style.maxWidth = '';
          floating.style.position = '';
        }
        return;
      }
      const reference = host.querySelector(
        '[data-pq-compose-ai-trigger]'
      ) as HTMLElement | null;
      if (!reference || !floating) {
        return;
      }
      stop?.();
      stop = autoUpdate(reference, floating, () => {
        computePosition(reference, floating, {
          placement: 'top-end',
          strategy: 'fixed',
          middleware: [
            offset(12),
            flip({ padding: 16 }),
            shift({ padding: 16 }),
            size({
              padding: 16,
              apply({
                availableHeight,
                availableWidth,
                elements,
              }: {
                availableHeight: number;
                availableWidth: number;
                elements: { floating: HTMLElement };
              }) {
                elements.floating.style.maxHeight = `${Math.max(
                  200,
                  availableHeight
                )}px`;
                elements.floating.style.maxWidth = `${Math.min(
                  384,
                  Math.max(0, availableWidth)
                )}px`;
              },
            }),
          ],
        }).then(({ x, y, strategy }) => {
          Object.assign(floating.style, {
            position: strategy,
            left: `${x}px`,
            top: `${y}px`,
            right: 'auto',
            bottom: 'auto',
            margin: '0',
            inset: 'auto',
          });
        });
      });
    };

    attach();
    const mo = new MutationObserver(attach);
    mo.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    window.addEventListener('resize', attach);
    return () => {
      mo.disconnect();
      window.removeEventListener('resize', attach);
      stop?.();
    };
  }, [hostRef, open]);
}

/**
 * Composer-footer AI control. Configured: CopilotKit popup chat. Unconfigured:
 * same control, links to Connections with a setup hint. Never a viewport-edge FAB.
 */
export const ComposeAiAssistant: FC = () => {
  const t = useT();
  const { touch } = useViewport();
  const aiOk = useAiAvailable();
  const hostRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  usePinCopilotWindow(hostRef, open);

  const label = t('your_assistant', 'AI assistant');
  const unconfiguredTip = t(
    'compose_ai_unconfigured_tip',
    'AI assistant needs OpenAI configured. Discover Claude, ChatGPT, and MCP agents in Connections.'
  );

  return (
    <div
      ref={hostRef}
      data-pq-compose-ai
      className="relative shrink-0"
    >
      <style>
        {`
          [data-pq-compose-ai] .copilotKitPopup {
            position: relative !important;
            inset: auto !important;
            bottom: auto !important;
            right: auto !important;
            left: auto !important;
            top: auto !important;
            z-index: 50;
            display: block;
            width: auto;
            height: auto;
          }
          [data-pq-compose-ai] .copilotKitModalChildrenWrapper:empty {
            display: none;
          }
          [data-pq-compose-ai] .copilotKitWindow {
            z-index: 250;
          }
        `}
      </style>
      {aiOk ? (
        <CopilotPopup
          className="pq-compose-ai"
          hitEscapeToClose={false}
          clickOutsideToClose={true}
          onSetOpen={setOpen}
          Button={ComposeAiPopupButton}
          instructions={COPILOT_INSTRUCTIONS}
          labels={{
            title: label,
            initial: t(
              'assistant_initial_message',
              'Hi! I can refine or rewrite your post text. I cannot generate images — use AI Image / AI Video in the toolbar for that.'
            ),
          }}
        />
      ) : (
        <NextLink
          href="/connections"
          data-pq-compose-ai-trigger
          data-tooltip-id="tooltip"
          data-tooltip-content={unconfiguredTip}
          aria-label={label}
          className={triggerClassName(false, touch)}
        >
          <ComposeAiTriggerFace open={false} />
        </NextLink>
      )}
    </div>
  );
};
