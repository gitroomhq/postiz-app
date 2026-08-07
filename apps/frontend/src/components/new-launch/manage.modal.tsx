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
import { capitalize } from 'lodash';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { CopilotPopup } from '@copilotkit/react-ui';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { DummyCodeComponent } from '@gitroom/frontend/components/new-launch/dummy.code.component';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import {
  SettingsIcon,
  ChevronDownIcon,
  CloseIcon,
  TrashIcon,
} from '@gitroom/frontend/components/ui/icons';
import { useHasScroll } from '@gitroom/frontend/components/ui/is.scroll.hook';
import { useShortlinkPreference } from '@gitroom/frontend/components/settings/shortlink-preference.component';
import dayjs from 'dayjs';
import { Button } from '@gitroom/react/form/button';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import NextLink from 'next/link';
import { useClickOutside } from '@mantine/hooks';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

export const ManageModal: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const { aiEnabled } = useVariables();
  const { mobile } = useViewport();
  const ref = useRef(null);
  const existingData = useExistingData();
  const [loading, setLoading] = useState(false);
  const [postNowOpen, setPostNowOpen] = useState(false);
  const toaster = useToaster();
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
    await fetch(`/posts/${existingData.group}`, {
      method: 'DELETE',
    });
    mutate();
    modal.closeAll();
    return;
  }, [existingData, mutate, modal]);

  const schedule = useCallback(
    (type: 'draft' | 'now' | 'schedule' | 'update') => async () => {
      if (
        (type === 'now' || type === 'schedule') &&
        (existingData?.posts?.[0]?.state === 'PUBLISHED' ||
          (existingData?.posts?.[0]?.state === 'QUEUE' &&
            dayjs().isAfter(date.utc())))
      ) {
        const whatToDo = await new Promise((resolve) => {
          modal.openModal({
            title: 'What do you want to do?',
            children: (
              <div className="flex flex-col">
                <div className="text-[20px] mb-[20px]">
                  This post was already published, what do you want to do?
                </div>
                <div className="flex w-full gap-[10px]">
                  <div className="flex-1 flex">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => resolve('update')}
                    >
                      Just update the post details
                    </Button>
                  </div>
                  <div className="flex-1 flex">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => resolve('republish')}
                    >
                      Republish the post
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
      }

      setLoading(true);

      // Pull the local values to build the payload, but rely on the server
      // (`/posts/valid`) for the actual validation — checkValidity now lives
      // server-side so it can't be bypassed.
      const allValues = await ref.current.getAllValues();

      const integrationById = (id: string) =>
        selectedIntegrations.find((p) => p.integration.id === id);

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
        const checkAllValid = await (
          await fetch('/posts/valid', {
            method: 'POST',
            body: JSON.stringify({ type, posts }),
          })
        ).json();

        const focus = (id: string, where: 'fix' | 'preview') => {
          integrationById(id)?.ref?.current?.[where]?.();
        };

        const notEnoughChars = checkAllValid.filter((p: any) => p.emptyContent);

        for (const item of notEnoughChars) {
          toaster.show(
            `${capitalize(item.identifier.split('-')[0])} (${item.name}):` +
              ' ' +
              t(
                'post_needs_content_or_image',
                'Your post should have at least one character or one image.'
              ),
            'warning'
          );
          setLoading(false);
          focus(item.id, 'preview');
          return;
        }

        if (type !== 'draft') {
          for (const item of checkAllValid) {
            if (item.valid === false) {
              toaster.show(
                `${capitalize(item.identifier.split('-')[0])} (${item.name}): ${
                  item.settingsError ||
                  t('please_fix_your_settings', 'Please fix your settings')
                }`,
                'warning'
              );
              focus(item.id, 'fix');
              setLoading(false);
              setShowSettings(true);
              return;
            }

            if (item.errors !== true) {
              toaster.show(
                `${capitalize(item.identifier.split('-')[0])} (${item.name}): ${
                  item.errors
                }`,
                'warning'
              );
              focus(item.id, 'preview');
              setLoading(false);
              setShowSettings(false);
              return;
            }

            if (item.tooLong) {
              toaster.show(
                `${item.name} (${item.identifier}) ${t(
                  'post_is_too_long',
                  'post is too long, please fix it'
                )}`,
                'warning'
              );
              focus(item.id, 'preview');
              setLoading(false);
              return;
            }
          }
        }
      }

      const shortlinkPreference = shortlinkPreferenceData?.shortlink || 'ASK';

      let shortLink = false;

      if (!dummy && shortlinkPreference !== 'NO') {
        const shortLinkUrl = await (
          await fetch('/posts/should-shortlink', {
            method: 'POST',
            body: JSON.stringify({
              messages: allValues
                // platforms that remove links won't keep shortlinks either
                .filter(
                  (p: any) => !integrationById(p.id)?.integration?.stripLinks
                )
                .flatMap((p: any) => p.values.flatMap((a: any) => a.content)),
            }),
          })
        ).json();

        if (shortLinkUrl.ask) {
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
    },
    [ref, repeater, tags, date, addEditSets, dummy, shortlinkPreferenceData]
  );

  return (
    <div className="relative flex h-full w-full flex-1 p-[40px] tablet:p-[16px] mobile:p-0">
      <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-pqInner shadow-pq mobile:rounded-none">
        <div
          className={clsx(
            'flex flex-1',
            // Design <760: editor + preview stack; preview capped ~340px.
            mobile ? 'flex-col' : 'flex-row'
          )}
        >
          <div
            className={clsx(
              'flex min-h-0 flex-1 flex-col',
              !mobile && 'border-e border-pqBorder'
            )}
          >
            <div className="flex h-[65px] items-center gap-[12px] rounded-ss-[20px] border-b border-pqLine bg-pqBg px-[20px] font-display text-[20px] font-[600] -tracking-[0.015em] text-pqText mobile:rounded-none">
              {existingData?.integration
                ? t('edit_post_title', 'Edit Post')
                : t('create_post_title', 'Create Post')}
              <CreationMethodBadge
                creationMethod={existingData?.posts?.[0]?.creationMethod}
                size="sm"
              />
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <div
                className={clsx('flex-1 relative', showSettings && 'hidden')}
              >
                <div
                  id="social-content"
                  className="gap-[32px] flex flex-col pe-[8px] pt-[20px] ps-[20px] absolute top-0 left-0 w-full h-full overflow-x-hidden overflow-y-scroll scrollbar scrollbar-thumb-pqColColor scrollbar-track-pqInner"
                >
                  <div className="flex w-full items-start gap-[16px]">
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
              'flex flex-col',
              mobile
                ? 'w-full max-h-[340px] shrink-0 border-t border-pqBorder'
                : 'w-[580px]'
            )}
          >
            <div
              className={clsx(
                'flex h-[65px] items-center border-b border-pqLine bg-pqBg px-[20px] font-display text-[20px] font-[600] -tracking-[0.015em] text-pqText mobile:rounded-none',
                !mobile && 'rounded-se-[20px]'
              )}
            >
              <div className="flex-1">{t('post_preview', 'Post Preview')}</div>
              <button
                type="button"
                onClick={askClose}
                aria-label={t('close', 'Close')}
                className="grid h-[30px] w-[30px] place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <Scrollable
                scrollClasses="!pe-[20px]"
                className="absolute top-0 p-[20px] pe-[8px] left-0 w-full h-full overflow-x-hidden overflow-y-scroll scrollbar scrollbar-thumb-pqColColor scrollbar-track-pqInner"
              >
                <ShowAllProviders ref={ref} />
              </Scrollable>
            </div>
          </div>
        </div>
        <div className="select-none h-[84px] py-[20px] border-t border-pqBorder flex min-w-0 items-center overflow-x-auto overflow-y-hidden scrollbar scrollbar-thumb-pqBorder scrollbar-track-transparent">
          <div className="flex min-w-0 flex-1 items-center gap-[8px] ps-[20px]">
            {!dummy && (
              <TagsComponent
                name="tags"
                label={t('tags', 'Tags')}
                initial={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                }}
              />
            )}

            {!dummy && (
              <RepeatComponent repeat={repeater} onChange={setRepeater} />
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-[8px] pe-[20px]">
            {existingData?.integration && (
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
            <DatePicker onChange={setDate} date={date} />
            {!addEditSets && (
              <button
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
                className="relative flex h-[42px] cursor-pointer items-center justify-center rounded-[10px] bg-btnSimple px-[18px] text-[14px] font-[600] disabled:cursor-not-allowed"
              >
                {loading && (
                  <div className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]">
                    <div className="h-[20px] w-[20px] animate-spin rounded-full border-4 border-textColor border-t-transparent" />
                  </div>
                )}
                <div className={clsx(loading && 'invisible')}>
                  {t('save_as_draft', 'Save as Draft')}
                </div>
              </button>
            )}
            {addEditSets && (
              <button
                className="btnSub flex h-[42px] min-w-[168px] items-center justify-center gap-[8px] rounded-[10px] bg-pqBrand px-[18px] text-[14px] font-[600] text-white outline-none disabled:cursor-not-allowed disabled:opacity-80"
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
              >
                Save Set
              </button>
            )}
            {!addEditSets && (
              <div className="relative" ref={postNowClickRef}>
                <div className="flex" ref={postNowRef}>
                  <button
                    type="button"
                    disabled={
                      selectedIntegrations.length === 0 || loading || locked
                    }
                    onClick={schedule('schedule')}
                    className="btnSub relative flex h-[42px] min-w-[168px] items-center justify-center rounded-s-[10px] bg-pqBrand px-[18px] text-[14px] font-[600] text-white outline-none disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    {loading && (
                      <div className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]">
                        <div className="h-[20px] w-[20px] animate-spin rounded-full border-4 border-white border-t-transparent" />
                      </div>
                    )}
                    <span className={clsx(loading && 'invisible')}>
                      {selectedIntegrations.length === 0
                        ? t(
                            'check_circles_above',
                            'Check the circles above to pick a channel'
                          )
                        : dummy
                        ? t('create_output', 'Create output')
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
                      className="grid h-[42px] w-[38px] place-items-center rounded-e-[10px] bg-pqBrand text-white shadow-[inset_1px_0_0_rgba(255,255,255,.24)] outline-none disabled:cursor-not-allowed disabled:opacity-80"
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
      {/* CopilotKit only when AI configured — otherwise show discoverability shell. */}
      {aiEnabled ? (
        <CopilotPopup
          hitEscapeToClose={false}
          clickOutsideToClose={true}
          instructions={`
You are an assistant that helps the user schedule social media posts.
You can only edit post text in the compose thread. You cannot generate images or video.
Here are the things you can do:
- Add a new comment / post to the list of posts
- Delete a comment / post from the list of posts
- Add content to the comment / post
- Activate or deactivate the comment / post

Post content can be added using the addPostContentFor{num} function.
After using the addPostFor{num} it will create a new addPostContentFor{num+ 1} function.
`}
          labels={{
            title: t('your_assistant', 'AI writing help'),
            initial: t(
              'assistant_initial_message',
              'Hi! I can refine or rewrite your post text. I cannot generate images — use AI Image / AI Video in the toolbar for that.'
            ),
          }}
        />
      ) : (
        <NextLink
          href="/connections"
          data-tooltip-id="tooltip"
          data-tooltip-content={t(
            'compose_ai_unconfigured_tip',
            'AI assistant needs OpenAI configured. Discover Claude, ChatGPT, and MCP agents in Connections.'
          )}
          className="absolute bottom-[104px] end-[24px] z-[40] grid h-[56px] w-[56px] place-items-center rounded-full bg-pqBrand text-pqOnBrand shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--brand)_80%,transparent)] transition-transform hover:scale-[1.04]"
          aria-label={t('compose_ai_unconfigured_tip', 'AI writing help')}
        >
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.6 6.6 5.2 5.2M18.8 18.8l-1.4-1.4M17.4 6.6l1.4-1.4M5.2 18.8l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </NextLink>
      )}
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
