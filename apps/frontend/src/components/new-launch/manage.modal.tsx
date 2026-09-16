'use client';

import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AddEditModalProps } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PicksSocialsComponent } from '@gitroom/frontend/components/new-launch/picks.socials.component';
import { EditorWrapper } from '@gitroom/frontend/components/new-launch/editor';
import { SelectCurrent } from '@gitroom/frontend/components/new-launch/select.current';
import { ShowAllProviders } from '@gitroom/frontend/components/new-launch/providers/show.all.providers';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { DatePicker } from '@gitroom/frontend/components/launches/helpers/date.picker';
import { useDateFormat } from '@gitroom/frontend/components/launches/helpers/date.format';
import { useShallow } from 'zustand/react/shallow';
import { RepeatComponent } from '@gitroom/frontend/components/launches/repeat.component';
import { TagsComponent } from '@gitroom/frontend/components/launches/tags.component';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { channelNameWithHandle } from '@gitroom/frontend/components/channels/channel-handle';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { DummyCodeComponent } from '@gitroom/frontend/components/new-launch/dummy.code.component';
import { ComposeAiAssistant } from '@gitroom/frontend/components/new-launch/compose.ai.assistant';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import {
  SettingsIcon,
  ChevronDownIcon,
  CloseIcon,
  ExpandIcon,
  CollapseIcon,
  TrashIcon,
} from '@gitroom/frontend/components/ui/icons';
import { useHasScroll } from '@gitroom/frontend/components/ui/is.scroll.hook';
import { useShortlinkPreference } from '@gitroom/frontend/components/settings/shortlink-preference.component';
import dayjs from 'dayjs';
import { Button } from '@gitroom/react/form/button';
import {
  PQ_COMPOSER_SPLIT_MIN,
  useViewport,
} from '@gitroom/frontend/components/layout/use.viewport';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useClickOutside } from '@mantine/hooks';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { Spinner } from '@gitroom/react/ui/spinner';

/** Side-by-side editor + preview once the viewport can hold a 420px preview. */
export const COMPOSER_SPLIT_MIN = PQ_COMPOSER_SPLIT_MIN;

export type ComposerPane = 'edit' | 'preview' | 'schedule';

const hideChatbaseWhileComposerOpen = () => {
  const mark = 'data-pq-cbh';
  const hideEl = (el: HTMLElement) => {
    if (el.getAttribute(mark) !== '1') {
      el.setAttribute(mark, '1');
    }
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('opacity', '0', 'important');
  };
  const selector =
    '#chatbase-bubble-button, #chatbase-bubble-window, [id^="chatbase-bubble"], [id*="chatbase"], iframe[src*="chatbase"]';
  const hide = () => {
    document.documentElement.setAttribute('data-pq-sheet', '1');
    document.querySelectorAll<HTMLElement>(selector).forEach(hideEl);
    document.querySelectorAll('iframe').forEach((el) => {
      const style = window.getComputedStyle(el);
      const src = el.getAttribute('src') || '';
      if (
        style.position === 'fixed' ||
        src.includes('chatbase') ||
        el.id.includes('chatbase')
      ) {
        hideEl(el);
      }
    });
  };
  hide();
  const id = window.setInterval(hide, 1000);
  return () => {
    window.clearInterval(id);
    document.documentElement.removeAttribute('data-pq-sheet');
    document.querySelectorAll<HTMLElement>(`[${mark}]`).forEach((el) => {
      el.removeAttribute(mark);
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('opacity');
    });
  };
};

const ComposerStepTabs: FC<{
  pane: ComposerPane;
  phone: boolean;
  onPane: (pane: ComposerPane) => void;
}> = ({ pane, phone, onPane }) => {
  const t = useT();
  const steps = (
    phone
      ? [
          ['edit', t('write', 'Write')],
          ['preview', t('preview', 'Preview')],
          ['schedule', t('schedule', 'Schedule')],
        ]
      : [
          ['edit', t('edit', 'Edit')],
          ['preview', t('preview', 'Preview')],
        ]
  ) as ReadonlyArray<readonly [ComposerPane, string]>;

  return (
    <div
      role="tablist"
      aria-label={t('create_post_title', 'Create Post')}
      className={clsx(
        'flex rounded-pqSm bg-pqSettings p-[2px]',
        phone && 'w-full'
      )}
    >
      {steps.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={pane === id}
          onClick={() => onPane(id)}
          className={clsx(
            'h-[44px] min-w-[44px] flex-1 rounded-[6px] px-[10px] text-[12.5px] font-[600]',
            pane === id ? 'bg-pqInner text-pqText shadow-pqE1' : 'text-pqSoft'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export const ManageModal: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const { mobile, touch, splitComposer } = useViewport();
  const compactChrome = !splitComposer;
  const compactFooter = touch;
  const phoneFlow = mobile;
  const [composerPane, setComposerPane] = useState<ComposerPane>('edit');
  const [maximized, setMaximized] = useState(false);
  const ref = useRef(null);
  const existingData = useExistingData();
  const [loading, setLoading] = useState(false);
  const [postNowOpen, setPostNowOpen] = useState(false);
  const toaster = useToaster();
  const { dropPostGroupFromView } = useCalendar();
  const modal = useModals();
  const { formatShortWeekdayTime } = useDateFormat();
  const [showSettings, setShowSettings] = useState(false);
  const { data: shortlinkPreferenceData } = useShortlinkPreference();
  // Footer overflow-y-hidden clips absolute menus; fixed popover escapes it.
  const { referenceRef: postNowRef, floatingRef: postNowMenuRef } =
    useAnchoredPopover<HTMLDivElement, HTMLDivElement>(postNowOpen, 'end', {
      offsetPx: 10,
      placement: 'top-end',
    });
  const postNowClickRef = useClickOutside(() => {
    if (postNowOpen) {
      setPostNowOpen(false);
    }
  });

  const { addEditSets, mutate, customClose, dummy } = props;

  const {
    selectedIntegrations,
    hide,
    date,
    setDate,
    repeater,
    setRepeater,
    tags,
    setTags,
    integrations,
    setSelectedIntegrations,
    locked,
    current,
    activateExitButton,
    setHide,
  } = useLaunchStore(
    useShallow((state) => ({
      hide: state.hide,
      setHide: state.setHide,
      date: state.date,
      setDate: state.setDate,
      current: state.current,
      repeater: state.repeater,
      setRepeater: state.setRepeater,
      tags: state.tags,
      setTags: state.setTags,
      selectedIntegrations: state.selectedIntegrations,
      integrations: state.integrations,
      setSelectedIntegrations: state.setSelectedIntegrations,
      locked: state.locked,
      activateExitButton: state.activateExitButton,
    }))
  );

  useEffect(() => {
    if (hide) {
      setHide(false);
    }
  }, [hide]);

  useEffect(() => hideChatbaseWhileComposerOpen(), []);

  // Schedule is a phone-only column. Leaving the mobile bucket while that
  // pane is selected would hide both Edit and Preview with nothing to show.
  useEffect(() => {
    if (!phoneFlow && composerPane === 'schedule') {
      setComposerPane('edit');
    }
  }, [phoneFlow, composerPane]);

  const currentIntegrationText = useMemo(() => {
    if (current === 'global') {
      return (
        <div className="flex items-center gap-[10px]">
          <div className="relative">
            <SettingsIcon size={15} className="text-pqText" />
          </div>
          <div>Settings</div>
        </div>
      );
    }

    const currentIntegration = integrations.find((p) => p.id === current)!;

    return (
      <div className="flex items-center gap-[10px]">
        <div className="relative">
          <img
            src={`/icons/platforms/${currentIntegration.identifier}.png`}
            className="w-[20px] h-[20px] rounded-[4px]"
            alt={currentIntegration.identifier}
          />
          <SettingsIcon
            size={15}
            className="absolute -end-[5px] -bottom-[5px] text-pqText"
          />
        </div>
        <div>
          {currentIntegration.name} {t('channel_settings', 'Settings')}
        </div>
      </div>
    );
  }, [current]);

  const changeCustomer = useCallback(
    (customer: string) => {
      const neededIntegrations = integrations.filter(
        (p) => p?.customer?.id === customer
      );
      setSelectedIntegrations(
        neededIntegrations.map((p) => ({
          settings: {},
          selectedIntegrations: p,
        }))
      );
    },
    [integrations]
  );

  const askClose = useCallback(async () => {
    if (!activateExitButton || dummy) {
      return;
    }

    if (
      await deleteDialog(
        t(
          'are_you_sure_you_want_to_close_this_modal_all_data_will_be_lost',
          'Are you sure you want to close this modal? (all data will be lost)'
        ),
        t('yes_close_it', 'Yes, close it!'),
        undefined,
        undefined,
        false
      )
    ) {
      if (customClose) {
        customClose();
        return;
      }
      modal.closeAll();
    }
  }, [activateExitButton, dummy]);

  const deletePost = useCallback(async () => {
    setLoading(true);
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_you_want_to_delete_post',
          'Are you sure you want to delete this post?'
        ),
        t('yes_delete_it', 'Yes, delete it!')
      ))
    ) {
      setLoading(false);
      return;
    }
    // customFetch resolves on 4xx/5xx, so an unchecked delete closed the editor
    // and refreshed the calendar as if the post were gone — it was still there,
    // and reappeared on the next load.
    const response = await fetch(`/posts/${existingData.group}`, {
      method: 'DELETE',
    });

    if (!response?.ok) {
      setLoading(false);
      toaster.show(
        t('post_delete_failed', 'Could not delete this post, please try again'),
        'warning'
      );
      return;
    }

    dropPostGroupFromView(existingData.group);
    mutate();
    modal.closeAll();
    return;
  }, [existingData, mutate, modal, toaster, t, dropPostGroupFromView]);

  const schedule = useCallback(
    (type: 'draft' | 'now' | 'schedule' | 'update') => async () => {
      let republish = false;
      if (
        (type === 'now' || type === 'schedule') &&
        (existingData?.posts?.[0]?.state === 'PUBLISHED' ||
          (existingData?.posts?.[0]?.state === 'QUEUE' &&
            dayjs().isAfter(date.utc())))
      ) {
        const channels = selectedIntegrations
          .map((p) => p.integration.name)
          .join(', ');
        const isRecurring =
          !!repeater || !!existingData?.posts?.[0]?.intervalInDays;

        const whatToDo = await new Promise((resolve) => {
          modal.openModal({
            title: t('what_do_you_want_to_do', 'What do you want to do?'),
            children: (
              <div className="flex flex-col">
                <div className="text-[20px] mb-[20px]">
                  {t(
                    'post_already_published_republish_warning',
                    'This post was already published. Republishing will publish it again to'
                  )}{' '}
                  {channels} {t('republish_at', 'at')}{' '}
                  {date.format('DD/MM/YYYY HH:mm')}.
                  {isRecurring && (
                    <div className="mt-[10px]">
                      {t(
                        'republish_recurring_note',
                        'This is a recurring post: your changes apply to all future recurrences starting now.'
                      )}
                    </div>
                  )}
                </div>
                <div className="flex w-full gap-[10px]">
                  <div className="flex-1 flex">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => resolve('update')}
                    >
                      {t(
                        'just_update_post_details',
                        'Just update the post details'
                      )}
                    </Button>
                  </div>
                  <div className="flex-1 flex">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => resolve('republish')}
                    >
                      {t('republish_the_post', 'Republish the post')}
                    </Button>
                  </div>
                </div>
              </div>
            ),
          });
        });

        if (whatToDo === 'update') {
          type = 'update';
        }

        if (whatToDo === 'republish') {
          republish = true;
        }
      }

      setLoading(true);

      // Backstop for everything below. `schedule` is wired straight to onClick,
      // so any throw was an unhandled rejection that left `loading` true — and
      // with it every submit button disabled, trapping an unsaved post. The
      // guards above handle the known cases; this catches the rest.
      // `saved` marks the point after which the post exists server-side, so the
      // catch can tell "failed" from "succeeded then stumbled".
      let saved = false;
      try {
      // Pull the local values to build the payload, but rely on the server
      // (`/posts/valid`) for the actual validation — checkValidity now lives
      // server-side so it can't be bypassed.
      const allValues = await ref.current?.getAllValues?.();
      if (!allValues) {
        setLoading(false);
        toaster.show(
          t('something_went_wrong', 'Something went wrong'),
          'warning'
        );
        return;
      }

      const integrationById = (id: string) =>
        selectedIntegrations.find((p) => p.integration.id === id);

      const channelToastLabel = (item: {
        id: string;
        identifier?: string;
        name?: string;
      }) =>
        channelNameWithHandle({
          name: integrationById(item.id)?.integration.name || item.name,
          display: integrationById(item.id)?.integration.display,
        }) || item.identifier || '';

      const group = existingData.group || makeId(10);

      const posts = allValues.map((post: any) => ({
        integration: {
          id: post.id,
        },
        group,
        settings: { ...(post.settings || {}) },
        value: post.values.map((value: any) => ({
          ...(value.id ? { id: value.id } : {}),
          content: value.content,
          delay: value.delay || 0,
          image:
            (value?.media || []).map(
              ({ id, path, alt, thumbnail, thumbnailTimestamp }: any) => ({
                id,
                path,
                alt,
                thumbnail,
                thumbnailTimestamp,
              })
            ) || [],
        })),
      }));

      if (!dummy) {
        const validResponse = await fetch('/posts/valid', {
          method: 'POST',
          body: JSON.stringify({ type, posts }),
        });

        // customFetch resolves on 4xx/5xx, so this used to hand a Nest error
        // object to `.filter` below. That threw out of an un-caught click
        // handler and left `loading` true forever — every submit button is
        // disabled on it, so the user's unsaved post was sealed inside a modal
        // with no close button.
        const checkAllValid = validResponse.ok
          ? await validResponse.json().catch((): null => null)
          : null;

        if (!Array.isArray(checkAllValid)) {
          setLoading(false);
          toaster.show(
            t('post_validation_failed', 'Could not check the post, please try again'),
            'warning'
          );
          return;
        }

        const focus = (id: string, where: 'fix' | 'preview') => {
          integrationById(id)?.ref?.current?.[where]?.();
        };

        // Phone submit lives on Schedule; tablet submit can be on Preview.
        // Bounce back to Write so the toast has a visible surface to fix.
        // Content errors must not call preview()/setCurrent — that switches
        // off global editing and locks the editor behind "Edit content".
        const revealWriteForIssue = (kind: 'settings' | 'content') => {
          setComposerPane('edit');
          setShowSettings(kind === 'settings');
        };

        const notEnoughChars = checkAllValid.filter((p: any) => p.emptyContent);

        for (const item of notEnoughChars) {
          toaster.show(
            `${channelToastLabel(item)}: ` +
              t(
                'post_needs_content_or_image',
                'Your post should have at least one character or one image.'
              ),
            'warning'
          );
          setLoading(false);
          revealWriteForIssue('content');
          return;
        }

        if (type !== 'draft') {
          for (const item of checkAllValid) {
            if (item.valid === false) {
              toaster.show(
                `${channelToastLabel(item)}: ${
                  item.settingsError ||
                  t('please_fix_your_settings', 'Please fix your settings')
                }`,
                'warning'
              );
              focus(item.id, 'fix');
              setLoading(false);
              revealWriteForIssue('settings');
              return;
            }

            if (item.errors !== true) {
              toaster.show(
                `${channelToastLabel(item)}: ${item.errors}`,
                'warning'
              );
              setLoading(false);
              revealWriteForIssue('content');
              return;
            }

            if (item.tooLong) {
              toaster.show(
                `${channelToastLabel(item)} ${t(
                  'post_is_too_long',
                  'post is too long, please fix it'
                )}`,
                'warning'
              );
              setLoading(false);
              revealWriteForIssue('content');
              return;
            }
          }
        }
      }

      const shortlinkPreference = shortlinkPreferenceData?.shortlink || 'ASK';

      let shortLink = false;

      if (!dummy && shortlinkPreference !== 'NO') {
        const shortLinkResponse = await fetch('/posts/should-shortlink', {
          method: 'POST',
          body: JSON.stringify({
            messages: allValues
              // platforms that remove links won't keep shortlinks either
              .filter(
                (p: any) => !integrationById(p.id)?.integration?.stripLinks
              )
              .flatMap((p: any) => p.values.flatMap((a: any) => a.content)),
          }),
        });

        // Same shape as `/posts/valid` above. Shortlinking is an optional
        // nicety, so a failure here must not block the save — fall through
        // with `ask: false` rather than stranding the post.
        const shortLinkUrl = shortLinkResponse.ok
          ? await shortLinkResponse.json().catch(() => ({}))
          : {};

        if (shortLinkUrl?.ask) {
          if (shortlinkPreference === 'YES') {
            // Automatically shortlink without asking
            shortLink = true;
          } else {
            // ASK: Show the dialog
            shortLink = await deleteDialog(
              t(
                'shortlink_urls_question',
                'Do you want to shortlink the URLs? it will let you get statistics over clicks'
              ),
              t('yes_shortlink_it', 'Yes, shortlink it!'),
              undefined,
              t('no_original_urls', 'No, original URLs')
            );
          }
        }
      }

      const data = {
        type,
        ...(republish ? { republish } : {}),
        ...(repeater ? { inter: repeater } : {}),
        tags,
        shortLink,
        date: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts,
      };

      if (dummy) {
        modal.openModal({
          title: '',
          children: <DummyCodeComponent code={data} />,
          classNames: {
            modal: 'w-[100%] bg-transparent text-textColor',
          },
          size: '100%',
          withCloseButton: false,
          closeOnEscape: true,
          closeOnClickOutside: true,
        });

        setLoading(false);
      }

      if (!dummy) {
        const response = addEditSets
          ? (addEditSets(data), undefined)
          : await fetch('/posts', {
              method: 'POST',
              body: JSON.stringify(data),
            });

        // The result used to be discarded, so a rejected save — over the monthly
        // post cap, or failing server-side validation — still showed "Added
        // successfully" and closed the editor, losing everything the user wrote.
        if (response && !response.ok) {
          // The body is a Nest error object; showing it raw put
          // {"statusCode":400,...} in front of the user.
          const reason = await response
            .json()
            .then((body) => body?.message)
            .catch(() => '');

          setLoading(false);
          toaster.show(
            typeof reason === 'string' && reason
              ? reason
              : t('post_save_failed', 'Could not save the post, please try again'),
            'warning'
          );
          return;
        }

        // Past this line the post exists on the server (or the set callback has
        // been handed the data), so no later failure may be reported as one.
        saved = true;

        if (!addEditSets) {
          mutate();
          if (type === 'draft') {
            toaster.show(
              t('saved_as_draft', 'Saved as draft'),
              'success'
            );
          } else if (type === 'schedule') {
            toaster.show(
              t('scheduled_for_when', 'Scheduled for {when}').replace(
                '{when}',
                formatShortWeekdayTime(date.local())
              ),
              'success'
            );
          } else if (type === 'now') {
            toaster.show(
              t('publishing_now', 'Publishing now…'),
              'success'
            );
          } else {
            toaster.show(
              !existingData.integration
                ? t('added_successfully', 'Added successfully')
                : t('updated_successfully', 'Updated successfully')
            );
          }
        }
        if (customClose) {
          setTimeout(() => {
            customClose();
          }, 2000);
        }

        if (!addEditSets) {
          modal.closeAll();
        }
      }
      } catch (e) {
        // Keep this reachable in the console / Sentry: before the try existed
        // these were unhandled rejections, which at least got reported.
        console.error(e);
        setLoading(false);

        // Everything from the toasts down runs AFTER the post is already saved.
        // A throw there (mutate, date formatting) must not say "went wrong" and
        // leave the composer open — the user would submit again and, because a
        // new post mints a fresh `group`, get a duplicate.
        if (saved) {
          if (!addEditSets) {
            modal.closeAll();
          }
          return;
        }

        toaster.show(
          t('something_went_wrong', 'Something went wrong'),
          'warning'
        );
      }
    },
    [
      ref,
      repeater,
      tags,
      date,
      addEditSets,
      dummy,
      shortlinkPreferenceData,
      toaster,
      t,
    ]
  );

  return (
    <div
      id="add-edit-modal"
      data-pq="composer"
      data-pq-composer-max={maximized ? '1' : '0'}
      className={clsx(
        'relative flex h-full min-h-0 w-full flex-1',
        maximized && !touch && 'fixed inset-0 z-[401] h-dvh w-screen'
      )}
    >
      <div
        className={clsx(
          'flex min-h-0 flex-1 flex-col overflow-hidden shadow-pq',
          touch
            ? 'rounded-none bg-pqInner'
            : maximized
            ? 'rounded-none bg-pqBg'
            : 'rounded-[20px] bg-pqBg'
        )}
      >
        <div
          className={clsx(
            'flex min-h-0 flex-1',
            compactChrome ? 'flex-col' : 'flex-row gap-[12px] p-[12px]'
          )}
        >
          <div
            className={clsx(
              'flex min-h-0 flex-1 flex-col overflow-hidden',
              !compactChrome &&
                'rounded-[16px] bg-pqInner shadow-[inset_0_0_0_1px_var(--border)]',
              compactChrome && composerPane !== 'edit' && 'hidden'
            )}
          >
            <div
              className={clsx(
                'flex shrink-0 flex-col border-b border-pqLine bg-pqInner text-pqText',
                !compactChrome && 'rounded-ss-[16px]'
              )}
            >
              <div
                className={clsx(
                  'flex items-center gap-[12px] px-[16px] font-display font-[600] -tracking-[0.015em]',
                  phoneFlow ? 'h-[52px]' : 'h-[65px] px-[20px] text-[20px]'
                )}
              >
                <div className="min-w-0 flex-1 truncate text-[17px] min-[1024px]:text-[20px]">
                  {existingData?.integration
                    ? t('edit_post_title', 'Edit Post')
                    : t('create_post_title', 'Create Post')}
                  <span className="ms-[8px] inline-flex align-middle">
                    <CreationMethodBadge
                      creationMethod={existingData?.posts?.[0]?.creationMethod}
                      size="sm"
                    />
                  </span>
                </div>
                {compactChrome && !phoneFlow && (
                  <ComposerStepTabs
                    pane={composerPane === 'schedule' ? 'preview' : composerPane}
                    phone={false}
                    onPane={setComposerPane}
                  />
                )}
                {compactChrome && (
                  <button
                    type="button"
                    onClick={askClose}
                    aria-label={t('close', 'Close')}
                    className="grid size-[44px] shrink-0 place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
              {phoneFlow && (
                <div className="px-[12px] pb-[8px]">
                  <ComposerStepTabs
                    pane={composerPane}
                    phone
                    onPane={setComposerPane}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <div
                className={clsx('flex-1 relative', showSettings && 'hidden')}
              >
                <div
                  id="social-content"
                  className="gap-[32px] flex flex-col pe-[8px] pt-[20px] ps-[20px] absolute top-0 left-0 w-full h-full overflow-x-hidden overflow-y-scroll scrollbar scrollbar-thumb-pqColColor scrollbar-track-pqInner"
                >
                  <div className={clsx(
                    'flex w-full items-start gap-[16px]',
                    compactChrome && 'flex-col'
                  )}>
                    <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
                      <div className="flex items-center gap-[8px]">
                        <span className="text-[11px] font-[700] uppercase tracking-[0.06em] text-pqSoft">
                          {t('select_channels', 'Select channels')}
                        </span>
                        <span className="rounded-full bg-pqInner px-[8px] py-[2px] text-[11px] font-[600] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)]">
                          {selectedIntegrations.length === 0
                            ? t('none_yet', 'none yet')
                            : selectedIntegrations.length === 1
                            ? t('one_selected', '1 selected')
                            : t('n_selected', '{{count}} selected', {
                                count: selectedIntegrations.length,
                              })}
                        </span>
                      </div>
                      <PicksSocialsComponent toolTip={true} />
                    </div>
                    <div>
                      {!dummy && (
                        <SelectCustomer
                          onChange={changeCustomer}
                          integrations={integrations}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-1 gap-[6px] flex-col">
                    <div>
                      <SelectCurrent />
                    </div>
                    <div className="flex-1 flex">
                      {!hide && <EditorWrapper totalPosts={1} value="" />}
                    </div>
                    <div
                      id="social-empty"
                      className={clsx(
                        'pb-[16px]'
                        // current !== 'global' && 'hidden'
                      )}
                    />
                  </div>
                </div>
              </div>
              <div
                id="wrapper-settings"
                className={clsx(
                  'px-[20px] pb-[20px] select-none',
                  showSettings && 'flex flex-1 flex-col pt-[12px]',
                  current === 'global' && 'hidden'
                )}
              >
                <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-hidden rounded-[14px] bg-pqSettings p-[12px] shadow-[inset_0_0_0_1px_var(--border)]">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                      'flex h-[48px] w-full cursor-pointer items-center gap-[10px] rounded-[12px] bg-pqTableHeader px-[14px] text-start shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover',
                      showSettings && 'rounded-b-[10px]'
                    )}
                  >
                    <div className="flex-1 text-[13.5px] font-[600] text-pqText">
                      {currentIntegrationText}
                    </div>
                    <ChevronDownIcon
                      rotated={showSettings}
                      className="text-pqMuted"
                    />
                  </button>
                  <div
                    className={clsx(
                      !showSettings ? 'hidden' : 'relative min-h-0 flex-1',
                      'text-[14px] font-[500] text-pqText'
                    )}
                  >
                    <div className="absolute inset-0 flex flex-col overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-pqColColor scrollbar-track-pqSettings">
                      <div
                        id="social-settings"
                        className="flex flex-col gap-[12px] pe-[4px]"
                      />
                    </div>
                  </div>
                  <style>
                    {`#social-settings [data-id="${current}"] {display: block !important;}`}
                  </style>
                </div>
              </div>
            </div>
          </div>
          <div
            className={clsx(
              'flex min-h-0 flex-col overflow-hidden',
              compactChrome
                ? clsx(
                    'w-full flex-1',
                    composerPane !== 'preview' && 'hidden'
                  )
                : clsx(
                    'rounded-[16px] bg-pqInner shadow-[inset_0_0_0_1px_var(--border)]',
                    maximized ? 'w-[min(580px,42vw)]' : 'w-[580px]'
                  )
            )}
          >
            <div
              className={clsx(
                'flex shrink-0 flex-col border-b border-pqLine bg-pqInner text-pqText',
                !compactChrome && !maximized && 'rounded-se-[16px]'
              )}
            >
              <div
                className={clsx(
                  'flex items-center gap-[8px] px-[16px] font-display font-[600] -tracking-[0.015em] min-[1024px]:px-[20px]',
                  phoneFlow ? 'h-[52px] text-[17px]' : 'h-[65px] text-[20px]'
                )}
              >
                <div className="min-w-0 flex-1 truncate">
                  {t('post_preview', 'Post Preview')}
                </div>
                {compactChrome && !phoneFlow && (
                  <ComposerStepTabs
                    pane={composerPane === 'schedule' ? 'preview' : composerPane}
                    phone={false}
                    onPane={setComposerPane}
                  />
                )}
                {!touch && (
                  <button
                    type="button"
                    onClick={() => setMaximized((v) => !v)}
                    aria-label={
                      maximized
                        ? t('restore', 'Restore')
                        : t('full_screen', 'Full screen')
                    }
                    className="grid size-[44px] shrink-0 place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
                  >
                    {maximized ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={askClose}
                  aria-label={t('close', 'Close')}
                  className="grid size-[44px] shrink-0 place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              {phoneFlow && (
                <div className="px-[12px] pb-[8px]">
                  <ComposerStepTabs
                    pane={composerPane}
                    phone
                    onPane={setComposerPane}
                  />
                </div>
              )}
            </div>
            <div className="relative min-h-0 flex-1">
              <Scrollable
                scrollClasses="!pe-[20px]"
                className="absolute top-0 p-[20px] pe-[8px] pb-[min(34vh,260px)] left-0 w-full h-full overflow-x-hidden overflow-y-scroll snap-y snap-proximity scrollbar scrollbar-thumb-pqColColor scrollbar-track-pqInner"
              >
                <ShowAllProviders ref={ref} />
              </Scrollable>
            </div>
          </div>
          {phoneFlow && (
            <div
              className={clsx(
                'flex min-h-0 w-full flex-1 flex-col',
                composerPane !== 'schedule' && 'hidden'
              )}
            >
              <div className="flex h-[52px] shrink-0 items-center gap-[8px] border-b border-pqLine bg-pqBg px-[16px] font-display text-[17px] font-[600] text-pqText">
                <div className="min-w-0 flex-1 truncate">
                  {t('schedule', 'Schedule')}
                </div>
                <button
                  type="button"
                  onClick={askClose}
                  aria-label={t('close', 'Close')}
                  className="grid size-[44px] shrink-0 place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div className="px-[12px] pb-[8px]">
                <ComposerStepTabs
                  pane={composerPane}
                  phone
                  onPane={setComposerPane}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto px-[16px] py-[12px] scrollbar scrollbar-thumb-pqColColor scrollbar-track-pqInner">
                <DatePicker onChange={setDate} date={date} className="!ml-0 w-full !flex-none" />
                {!dummy && (
                  <div className="w-full [&>*]:w-full">
                    <TagsComponent
                      name="tags"
                      label={t('tags', 'Tags')}
                      initial={tags}
                      onChange={(e) => {
                        setTags(e.target.value);
                      }}
                    />
                  </div>
                )}
                {!dummy && (
                  <div className="w-full [&>*]:w-full">
                    <RepeatComponent repeat={repeater} onChange={setRepeater} />
                  </div>
                )}
                {composerPane === 'schedule' && <ComposeAiAssistant />}
                {existingData?.integration && (
                  <button
                    onClick={deletePost}
                    className="flex cursor-pointer items-center gap-[8px] text-[15px] font-[600] text-pqWarn"
                  >
                    <TrashIcon />
                    <div>{t('delete_post', 'Delete Post')}</div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {phoneFlow && composerPane !== 'schedule' && (
          <div className="flex min-w-0 shrink-0 gap-[8px] border-t border-pqBorder px-[16px] py-[12px] pb-[max(12px,env(safe-area-inset-bottom))]">
            {composerPane === 'preview' && (
              <button
                type="button"
                onClick={() => setComposerPane('edit')}
                className="flex h-[44px] min-w-0 flex-1 items-center justify-center rounded-[10px] bg-btnSimple text-[14px] font-[600]"
              >
                {t('back', 'Back')}
              </button>
            )}
            {composerPane === 'edit' && (
              <div className="min-w-0 flex-1 [&>*]:w-full">
                <ComposeAiAssistant />
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                setComposerPane(
                  composerPane === 'edit' ? 'preview' : 'schedule'
                )
              }
              className="btnSub flex h-[44px] min-w-0 flex-1 items-center justify-center rounded-[10px] bg-pqBrand px-[12px] text-[14px] font-[600] text-white"
            >
              {composerPane === 'edit'
                ? t('preview', 'Preview')
                : t('next', 'Next')}
            </button>
          </div>
        )}
        <div
          className={clsx(
            'flex min-w-0 select-none border-t border-pqBorder bg-pqInner pb-[max(12px,env(safe-area-inset-bottom))]',
            phoneFlow && composerPane !== 'schedule' && 'hidden',
            compactFooter
              ? 'flex-col gap-[10px] overflow-x-hidden px-[16px] py-[12px]'
              : 'min-h-[84px] items-center overflow-x-auto overflow-y-hidden py-[20px] scrollbar scrollbar-thumb-pqBorder scrollbar-track-transparent min-[1180px]:flex-row'
          )}
        >
          {!phoneFlow && (
          <div
            className={clsx(
              'min-w-0 gap-[8px]',
              compactFooter
                ? 'grid w-full grid-cols-2'
                : 'flex flex-1 items-center ps-[20px]'
            )}
          >
            {!dummy && (
              <div className={clsx('min-w-0', compactFooter && 'w-full [&>*]:w-full')}>
                <TagsComponent
                  name="tags"
                  label={t('tags', 'Tags')}
                  initial={tags}
                  onChange={(e) => {
                    setTags(e.target.value);
                  }}
                />
              </div>
            )}

            {!dummy && (
              <div className={clsx('min-w-0', compactFooter && 'w-full [&>*]:w-full')}>
                <RepeatComponent repeat={repeater} onChange={setRepeater} />
              </div>
            )}
          </div>
          )}
          <div
            className={clsx(
              'flex min-w-0 items-center justify-end gap-[8px]',
              compactFooter ? 'w-full flex-col' : 'shrink-0 pe-[20px]',
              phoneFlow && 'flex-row'
            )}
          >
            {!phoneFlow && <ComposeAiAssistant />}
            {!phoneFlow && existingData?.integration && (
              <button
                onClick={deletePost}
                className="cursor-pointer flex text-pqWarn gap-[8px] items-center text-[15px] font-[600]"
              >
                <div>
                  <TrashIcon />
                </div>
                <div>{t('delete_post', 'Delete Post')}</div>
              </button>
            )}
            {!phoneFlow && (
            <DatePicker
              onChange={setDate}
              date={date}
              className="max-[1179px]:!ml-0 max-[1179px]:w-full max-[1179px]:!flex-none"
            />
            )}
            <div
              className={clsx(
                'flex min-w-0 items-center justify-end gap-[8px]',
                compactFooter && 'w-full',
                phoneFlow && 'min-w-0 flex-1'
              )}
            >
            {!addEditSets && (
              <button
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
                className={clsx(
                  'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[10px] bg-btnSimple text-[14px] font-[600] disabled:cursor-not-allowed',
                  'max-[1179px]:h-[44px] max-[1179px]:min-w-0 max-[1179px]:flex-1 max-[1179px]:px-[12px]',
                  touch
                    ? 'h-[44px] min-w-0 flex-1 px-[12px]'
                    : 'h-[42px] px-[18px]'
                )}
              >
                {loading && (
                  <div className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] text-textColor">
                    <Spinner width={20} height={20} />
                  </div>
                )}
                <div
                  className={clsx(
                    'min-w-0 truncate whitespace-nowrap',
                    loading && 'invisible'
                  )}
                >
                  {t('save_as_draft', 'Save as Draft')}
                </div>
              </button>
            )}
            {addEditSets && (
              <button
                className={clsx(
                  'btnSub flex items-center justify-center gap-[8px] rounded-[10px] bg-pqBrand text-[14px] font-[600] text-white outline-none disabled:cursor-not-allowed disabled:opacity-80',
                  touch
                    ? 'h-[44px] min-w-0 flex-1 px-[12px]'
                    : 'h-[42px] min-w-[168px] px-[18px]'
                )}
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
              >
                Save Set
              </button>
            )}
            {!addEditSets && (
              <div className={clsx('relative', touch && 'flex min-w-0 flex-1')} ref={postNowClickRef}>
                <div className={clsx('flex min-w-0', touch && 'w-full')} ref={postNowRef}>
                  <button
                    type="button"
                    disabled={
                      selectedIntegrations.length === 0 || loading || locked
                    }
                    onClick={schedule('schedule')}
                    className={clsx(
                      'btnSub relative flex min-w-0 items-center justify-center overflow-hidden rounded-s-[10px] bg-pqBrand text-[14px] font-[600] text-white outline-none disabled:cursor-not-allowed disabled:opacity-80',
                      'max-[1179px]:h-[44px] max-[1179px]:flex-1 max-[1179px]:px-[12px] max-[1179px]:min-w-0',
                      touch
                        ? 'h-[44px] min-w-0 flex-1 px-[12px]'
                        : 'h-[42px] min-w-[168px] px-[18px]'
                    )}
                  >
                    {loading && (
                      <div className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] text-white">
                        <Spinner width={20} height={20} />
                      </div>
                    )}
                    <span
                      className={clsx(
                        'min-w-0 truncate whitespace-nowrap',
                        loading && 'invisible'
                      )}
                    >
                      {selectedIntegrations.length === 0
                        ? t('select_channels', 'Select channels')
                        : dummy
                        ? t('create_output', 'Create output')
                        : phoneFlow
                        ? t('schedule', 'Schedule')
                        : !existingData?.integration
                        ? t('add_to_calendar', 'Add to calendar')
                        : existingData?.posts?.[0]?.state === 'DRAFT'
                        ? t('schedule', 'Schedule')
                        : t('update', 'Update')}
                    </span>
                  </button>
                  {!dummy && (
                    <button
                      type="button"
                      disabled={
                        selectedIntegrations.length === 0 || loading || locked
                      }
                      onClick={() => setPostNowOpen((v) => !v)}
                      aria-label={t('more', 'More')}
                      data-tooltip-id="tooltip"
                      data-tooltip-content={t('more', 'More')}
                      className={clsx(
                        'grid w-[38px] shrink-0 place-items-center rounded-e-[10px] bg-pqBrand text-white shadow-[inset_1px_0_0_rgba(255,255,255,.24)] outline-none disabled:cursor-not-allowed disabled:opacity-80',
                        touch ? 'h-[44px]' : 'h-[42px]'
                      )}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        className="opacity-65"
                      >
                        <path
                          d="m6 9 6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {!dummy && postNowOpen && (
                  <div
                    ref={postNowMenuRef}
                    className="z-[300] w-[206px] rounded-[8px] border border-pqBorder bg-pqInner p-[12px] shadow-pq"
                  >
                    <button
                      type="button"
                      onClick={schedule('now')}
                      disabled={
                        selectedIntegrations.length === 0 || loading || locked
                      }
                      className="post-now flex h-[44px] w-full items-center justify-center rounded-[8px] bg-pqPink text-[15px] font-[600] text-white disabled:cursor-not-allowed disabled:opacity-80"
                    >
                      {t('post_now', 'Post Now')}
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Scrollable: FC<{
  className: string;
  scrollClasses: string;
  children: ReactNode;
}> = ({ className, scrollClasses, children }) => {
  const ref = useRef(undefined);
  const hasScroll = useHasScroll(ref);
  return (
    <div className={clsx(className, hasScroll && scrollClasses)} ref={ref}>
      {children}
    </div>
  );
};
