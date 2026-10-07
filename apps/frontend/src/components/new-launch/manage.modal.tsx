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
import {
  Providers,
  ShowAllProviders,
} from '@gitroom/frontend/components/new-launch/providers/show.all.providers';
import { getProviderSettingsMeta } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import {
  DatePicker,
  DatePickerPanel,
} from '@gitroom/frontend/components/launches/helpers/date.picker';
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
import { DummyCodeComponent } from '@gitroom/frontend/components/new-launch/dummy.code.component';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import {
  SettingsIcon,
  SettingsOutlineIcon,
  ChevronDownIcon,
  CloseIcon,
  TrashIcon,
  DropdownArrowSmallIcon,
  PlusIcon,
  EyeIcon,
  TagIcon,
  RepeatIcon,
} from '@gitroom/frontend/components/ui/icons';
import {
  MobileTopBar,
  MobileTopBarAction,
} from '@gitroom/frontend/components/new-launch/mobile.top.bar';
import {
  BottomSheet,
  BottomSheetButton,
  BottomSheetHeader,
  BottomSheetRow,
} from '@gitroom/frontend/components/ui/bottom.sheet.component';
import { useHasScroll } from '@gitroom/frontend/components/ui/is.scroll.hook';
import { useShortlinkPreference } from '@gitroom/frontend/components/settings/shortlink-preference.component';
import dayjs from 'dayjs';
import { Button } from '@gitroom/react/form/button';
import { useClickOutside } from '@mantine/hooks';

export const ManageModal: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const ref = useRef(null);
  const existingData = useExistingData();
  const [loading, setLoading] = useState(false);
  const toaster = useToaster();
  const modal = useModals();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [mobileSheet, setMobileSheet] = useState<
    'channels' | 'settings' | 'tags' | 'repeat' | 'date' | null
  >(null);
  const [showPostNow, setShowPostNow] = useState(false);
  const postNowRef = useClickOutside<HTMLDivElement>(() => {
    setShowPostNow(false);
  });
  const { data: shortlinkPreferenceData } = useShortlinkPreference();

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
    channelDates,
    setChannelDate,
  } = useLaunchStore(
    useShallow((state) => ({
      hide: state.hide,
      setHide: state.setHide,
      date: state.date,
      setDate: state.setDate,
      channelDates: state.channelDates,
      setChannelDate: state.setChannelDate,
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
  // the other channels of an existing post show and move only their own date
  const channelDate = channelDates[current];
  const pickerDate = channelDate || date;
  const setPickerDate = useCallback(
    (newDate: dayjs.Dayjs) => {
      if (channelDate) {
        return setChannelDate(current, newDate);
      }

      setDate(newDate);
    },
    [channelDate, current]
  );

  // the date sheet applies its changes only on save
  const [dateDraft, setDateDraft] = useState(date);

  // the channels the post already has, each with its own post
  const existingPosts = [existingData, ...(existingData.siblings || [])];

  useEffect(() => {
    if (hide) {
      setHide(false);
    }
  }, [hide]);

  const currentIntegrationText = useMemo(() => {
    if (current === 'global') {
      return (
        <div className="flex items-center gap-[10px]">
          <div className="relative mobile:hidden">
            <SettingsIcon size={15} className="text-white" />
          </div>
          <div>{t('settings', 'Settings')}</div>
        </div>
      );
    }

    const currentIntegration = integrations.find((p) => p.id === current)!;

    return (
      <div className="flex items-center gap-[10px]">
        <div className="relative mobile:hidden">
          <img
            src={`/icons/platforms/${currentIntegration.identifier}.png`}
            className="w-[20px] h-[20px] rounded-[4px]"
            alt={currentIntegration.identifier}
          />
          <SettingsIcon
            size={15}
            className="text-white absolute -end-[5px] -bottom-[5px]"
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
        t('yes_close_it', 'Yes, close it!')
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
    if (existingData.siblings?.length) {
      // the channel in view, or the one that was opened
      const channel =
        existingPosts.find((p) => p.integration === current) || existingData;
      const groups = await new Promise<string[]>((resolve) => {
        modal.openModal({
          id: 'delete-post-channels',
          title: t('delete_post', 'Delete Post'),
          onClose: () => resolve([]),
          children: (
            <div className="flex flex-col">
              <div className="text-[20px] mb-[20px]">
                {t(
                  'delete_post_from_all_channels_question',
                  'This post was created for more than one channel. Do you want to delete it from all of them?'
                )}
              </div>
              <div className="flex w-full gap-[10px]">
                <div className="flex-1 flex">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => {
                      modal.closeById('delete-post-channels');
                      resolve(existingPosts.map((p) => p.group!));
                    }}
                  >
                    {t('delete_from_all_channels', 'Delete from all channels')}
                  </Button>
                </div>
                <div className="flex-1 flex">
                  <Button
                    type="button"
                    secondary
                    className="flex-1"
                    onClick={() => {
                      modal.closeById('delete-post-channels');
                      resolve([channel.group!]);
                    }}
                  >
                    {t('delete_only_from', 'Only from')}{' '}
                    {
                      integrations.find((p) => p.id === channel.integration)
                        ?.name
                    }
                  </Button>
                </div>
              </div>
            </div>
          ),
        });
      });

      if (!groups.length) {
        setLoading(false);
        return;
      }

      await Promise.all(
        groups.map((group) =>
          fetch(`/posts/${group}`, {
            method: 'DELETE',
          })
        )
      );
      mutate();
      modal.closeAll();
      return;
    }

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
  }, [existingData, mutate, modal, current, integrations]);

  const schedule = useCallback(
    (type: 'draft' | 'now' | 'schedule' | 'update') => async () => {
      let republish = false;
      // channels saved without changing their state, the rest are saved as `type`
      let updateOnly: string[] = [];
      // the channels that already went out, or are going out right now
      const published = existingPosts.filter(
        (p) =>
          p.posts?.[0]?.state === 'PUBLISHED' ||
          (p.posts?.[0]?.state === 'QUEUE' &&
            dayjs().isAfter((channelDates[p.integration] || date).utc()))
      );

      if ((type === 'now' || type === 'schedule') && published.length) {
        const channels = published
          .map(
            (p) =>
              `${integrations.find((i) => i.id === p.integration)?.name} ${t(
                'republish_at',
                'at'
              )} ${(channelDates[p.integration] || date).format(
                'DD/MM/YYYY HH:mm'
              )}`
          )
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
                  {channels}.
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
          updateOnly = published.map((p) => p.integration);
        }

        if (whatToDo === 'republish') {
          republish = true;
        }
      }

      // another channel whose date already passed would go out right away, it
      // only gets its details saved
      if (type === 'schedule') {
        updateOnly = [
          ...updateOnly,
          ...existingPosts
            .filter(
              (p) =>
                p.integration !== existingData.integration &&
                !published.includes(p) &&
                dayjs().isAfter((channelDates[p.integration] || date).utc())
            )
            .map((p) => p.integration),
        ];
      }

      // a draft of a post with other channels leaves the published ones as they are
      if (type === 'draft' && existingData.siblings?.length) {
        updateOnly = published
          .filter((p) => p.posts[0].state === 'PUBLISHED')
          .map((p) => p.integration);
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
        // every channel of an existing post updates its own post
        group:
          existingPosts.find((p) => p.integration === post.id)?.group || group,
        ...(channelDates[post.id]
          ? {
              date: channelDates[post.id].utc().format('YYYY-MM-DDTHH:mm:ss'),
            }
          : {}),
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
        if (addEditSets) {
          addEditSets(data);
        } else {
          // the channels that only update their details are saved apart, first,
          // since a draft save skips the checks their update still runs
          let saved = false;
          for (const request of [
            {
              type: 'update',
              posts: posts.filter((p: any) =>
                updateOnly.includes(p.integration.id)
              ),
            },
            {
              type,
              posts: posts.filter(
                (p: any) => !updateOnly.includes(p.integration.id)
              ),
            },
          ]) {
            if (!request.posts.length) {
              continue;
            }

            const response = await fetch('/posts', {
              method: 'POST',
              body: JSON.stringify({ ...data, ...request }),
            });

            if (!response.ok) {
              if (response.status !== 402) {
                const { message } = await response.json().catch(() => ({}));
                toaster.show(
                  typeof message === 'string'
                    ? message
                    : t('post_save_failed', 'Could not save the post'),
                  'warning'
                );
              }
              // the channels saved before the failure show in the calendar
              if (saved) {
                mutate();
              }
              setLoading(false);
              return;
            }
            saved = true;
          }
        }

        if (!addEditSets) {
          mutate();
          toaster.show(
            !existingData.integration
              ? t('added_successfully', 'Added successfully')
              : t('updated_successfully', 'Updated successfully')
          );
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
    [
      ref,
      repeater,
      tags,
      date,
      channelDates,
      integrations,
      addEditSets,
      dummy,
      shortlinkPreferenceData,
    ]
  );

  const scheduleLabel = dummy
    ? t('create_output', 'Create output')
    : !existingData?.integration
    ? t('add_to_calendar', 'Add to calendar')
    : existingData?.posts?.[0]?.state === 'DRAFT'
    ? t('schedule', 'Schedule')
    : t('update', 'Update');

  const mobileActions: MobileTopBarAction[] = addEditSets
    ? [
        {
          label: t('save_set', 'Save Set'),
          variant: 'primary',
          onClick: schedule('draft'),
        },
      ]
    : [
        {
          label: scheduleLabel,
          variant: 'primary',
          onClick: schedule('schedule'),
        },
        ...(!dummy
          ? [
              {
                label: t('post_now', 'Post Now'),
                variant: 'secondary' as const,
                onClick: schedule('now'),
              },
            ]
          : []),
        {
          label: t('save_as_draft', 'Save as Draft'),
          variant: 'tertiary',
          onClick: schedule('draft'),
        },
      ];

  // the settings sheet links to the channel settings only when there are any
  const hasChannelSettings = useMemo(() => {
    const identifiers =
      current === 'global'
        ? selectedIntegrations.map((p) => p.integration.identifier)
        : [integrations.find((p) => p.id === current)?.identifier];

    return identifiers.some(
      (identifier) =>
        !!getProviderSettingsMeta(
          Providers.find((p) => p.identifier === identifier)?.component
        )?.SettingsComponent
    );
  }, [current, selectedIntegrations, integrations]);

  // on phones, the settings, tags, repeat and delete live in a settings sheet
  const settingsButton = !dummy && (
    <div
      onClick={() => setMobileSheet('settings')}
      className="hidden mobile:flex shrink-0 w-[32px] h-[44px] justify-end items-center cursor-pointer text-[#A3A3A3]"
    >
      <SettingsOutlineIcon />
    </div>
  );

  // phones have no room for the preview column, it replaces the editor instead
  const previewButton = (
    <div
      onClick={() => setMobileTab(mobileTab === 'preview' ? 'edit' : 'preview')}
      className={clsx(
        'hidden mobile:flex shrink-0 w-[32px] h-[44px] justify-end items-center cursor-pointer',
        mobileTab === 'preview' ? 'text-[#FC69FF]' : 'text-[#A3A3A3]'
      )}
    >
      <EyeIcon />
    </div>
  );

  return (
    <div className="w-full h-full flex-1 p-[40px] mobile:p-0 mobile:h-auto mobile:min-h-full flex relative">
      <div className="flex flex-1 min-w-0 bg-newBgColorInner rounded-[20px] mobile:rounded-none flex-col">
        <MobileTopBar
          onBack={askClose}
          actions={mobileActions}
          disabled={selectedIntegrations.length === 0 || loading || locked}
          loading={loading}
        >
          <DatePicker
            onChange={setPickerDate}
            date={pickerDate}
            onOpen={() => {
              setDateDraft(pickerDate);
              setMobileSheet('date');
            }}
          />
        </MobileTopBar>
        <div className="flex-1 flex mobile:contents">
          <div
            className={clsx(
              'flex flex-col flex-1 min-w-0 border-e border-newBorder mobile:border-e-0',
              mobileTab === 'preview' && 'mobile:flex-none'
            )}
          >
            <div className="bg-newBgColor h-[65px] rounded-s-[20px] !rounded-b-[0] mobile:hidden flex items-center gap-[12px] px-[20px] text-[20px] font-[600]">
              {t('create_post_title', 'Create Post')}
              <CreationMethodBadge
                creationMethod={existingData?.posts?.[0]?.creationMethod}
                size="sm"
              />
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <div
                className={clsx(
                  // mobile:flex wins over hidden, the settings sheet opens above the editor on phones
                  'flex-1 relative mobile:flex mobile:flex-col',
                  showSettings && 'hidden'
                )}
              >
                <div
                  id="social-content"
                  className="gap-[32px] mobile:gap-[16px] flex flex-col pe-[8px] pt-[20px] ps-[20px] mobile:px-[16px] mobile:pt-[12px] mobile:static mobile:flex-1 absolute top-0 left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
                >
                  <div
                    className={clsx(
                      'flex w-full',
                      !existingData.integration && 'mobile:hidden'
                    )}
                  >
                    <div className="flex flex-1">
                      <PicksSocialsComponent toolTip={true} />
                    </div>
                    <div className="mobile:hidden">
                      {/* an existing post keeps its channels */}
                      {!dummy && !existingData.integration && (
                        <SelectCustomer
                          onChange={changeCustomer}
                          integrations={integrations}
                        />
                      )}
                    </div>
                    {!!existingData.integration && (
                      <>
                        <div className="hidden mobile:flex items-center">
                          <CreationMethodBadge
                            creationMethod={
                              existingData?.posts?.[0]?.creationMethod
                            }
                            size="sm"
                          />
                        </div>
                        {previewButton}
                        {settingsButton}
                      </>
                    )}
                  </div>
                  <div className="flex flex-1 gap-[6px] mobile:gap-[16px] flex-col">
                    <div className="flex mobile:items-center mobile:gap-[4px]">
                      <div className="flex-1 mobile:flex-initial mobile:min-w-0">
                        {(!existingData.integration ||
                          !!existingData.siblings?.length) && <SelectCurrent />}
                      </div>
                      {!existingData.integration && (
                        <>
                          <div
                            onClick={() => setMobileSheet('channels')}
                            className="hidden mobile:flex shrink-0 w-[44px] h-[44px] rounded-[8px] bg-btnSimple justify-center items-center cursor-pointer"
                          >
                            <PlusIcon size={24} />
                          </div>
                          <div className="hidden mobile:block flex-1" />
                          {previewButton}
                          {settingsButton}
                        </>
                      )}
                    </div>
                    <div
                      className={clsx(
                        'flex-1 flex',
                        mobileTab === 'preview' && 'mobile:hidden'
                      )}
                    >
                      {!hide && <EditorWrapper totalPosts={1} value="" />}
                    </div>
                    <div
                      id="social-empty"
                      className={clsx(
                        'pb-[16px] mobile:pb-0'
                        // current !== 'global' && 'hidden'
                      )}
                    />
                  </div>
                </div>
              </div>
              {/* on phones the settings open as a bottom sheet */}
              <div
                className={clsx('contents', !showSettings && 'mobile:hidden')}
              >
                {showSettings && (
                  <div
                    onClick={() => setShowSettings(false)}
                    className="hidden mobile:block fixed inset-0 z-[599] bg-popup backdrop-blur-[8px] animate-fadeIn touch-none"
                  />
                )}
                <div
                  id="wrapper-settings"
                  className={clsx(
                    'pb-[20px] px-[20px] select-none',
                    showSettings &&
                      'flex-1 flex pt-[20px] mobile:fixed mobile:inset-x-0 mobile:bottom-0 mobile:z-[600] mobile:max-h-[90%] mobile:p-0',
                    current === 'global' && 'hidden'
                  )}
                >
                  <div className="flex-1 flex flex-col rounded-[12px] gap-[12px] overflow-hidden bg-newSettings mobile:rounded-none mobile:rounded-t-[24px] mobile:gap-0 mobile:pt-[8px] mobile:pb-[24px] mobile:bg-newBgColorInner mobile:animate-fade">
                    <div className="hidden mobile:contents">
                      <BottomSheetHeader
                        title={currentIntegrationText}
                        onClose={() => setShowSettings(false)}
                      />
                    </div>
                    <div
                      onClick={() => setShowSettings(!showSettings)}
                      className={clsx(
                        'bg-[#612BD3] rounded-[12px] flex items-center gap-[8px] cursor-pointer p-[12px] mobile:hidden',
                        showSettings ? '!rounded-b-none' : ''
                      )}
                    >
                      <div className="flex-1 text-[14px] font-[600] text-white">
                        {currentIntegrationText}
                      </div>
                      <div>
                        <ChevronDownIcon
                          rotated={showSettings}
                          className="text-white"
                        />
                      </div>
                    </div>
                    <div
                      className={clsx(
                        !showSettings ? 'hidden' : 'flex-1',
                        'text-[14px] text-textColor font-[500] relative mobile:min-h-0 mobile:overflow-y-auto mobile:overscroll-contain'
                      )}
                    >
                      <div className="absolute mobile:static left-0 top-0 w-full h-full mobile:h-auto flex flex-col overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newBgColorInner scrollbar-track-newColColor">
                        <div
                          id="social-settings"
                          className="flex flex-col gap-[20px] bg-newBgColor mobile:bg-transparent"
                        />
                      </div>
                    </div>
                    <div className="hidden mobile:contents">
                      <BottomSheetButton
                        label={t('done', 'Done')}
                        onClick={() => setShowSettings(false)}
                      />
                    </div>
                    <style>
                      {`#social-settings [data-id="${current}"] {display: block !important;}`}
                    </style>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={clsx(
              'w-[580px] tablet:w-[440px] mobile:!w-full flex flex-col mobile:flex-1',
              mobileTab === 'edit' && 'mobile:hidden'
            )}
          >
            <div className="bg-newBgColor h-[65px] rounded-e-[20px] !rounded-b-[0] mobile:hidden flex items-center px-[20px] text-[20px] font-[600]">
              <div className="flex-1">{t('post_preview', 'Post Preview')}</div>
              <div className="cursor-pointer mobile:hidden">
                <CloseIcon onClick={askClose} className="text-[#A3A3A3]" />
              </div>
            </div>
            <div className="flex-1 relative">
              <Scrollable
                scrollClasses="!pe-[20px]"
                className="absolute mobile:static top-0 p-[20px] pe-[8px] mobile:p-[16px] left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
              >
                <ShowAllProviders ref={ref} />
              </Scrollable>
            </div>
          </div>
        </div>
        <div className="select-none h-[84px] py-[20px] border-t border-newBorder flex items-center mobile:hidden">
          <div className="flex-1 flex ps-[20px] gap-[8px]">
            {/* keep a single tags component mounted, the tags sheet has its own */}
            {!dummy && mobileSheet !== 'tags' && (
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
          <div className="pe-[20px] flex items-center justify-end gap-[8px]">
            {existingData?.integration && (
              <button
                onClick={deletePost}
                className="cursor-pointer flex text-[#FF3F3F] gap-[8px] items-center text-[15px] font-[600]"
              >
                <div>
                  <TrashIcon />
                </div>
                <div>{t('delete_post', 'Delete Post')}</div>
              </button>
            )}
            <DatePicker onChange={setPickerDate} date={pickerDate} />
            {!addEditSets && (
              <button
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
                className="relative cursor-pointer disabled:cursor-not-allowed px-[20px] h-[44px] bg-btnSimple justify-center items-center flex rounded-[8px] text-[15px] font-[600]"
              >
                {loading && (
                  <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                    <div className="animate-spin h-[20px] w-[20px] border-4 border-textColor border-t-transparent rounded-full" />
                  </div>
                )}
                <div className={clsx(loading && 'invisible')}>
                  {t('save_as_draft', 'Save as Draft')}
                </div>
              </button>
            )}
            {addEditSets && (
              <button
                className="text-white text-[15px] font-[600] min-w-[180px] btnSub disabled:cursor-not-allowed disabled:opacity-80 outline-none gap-[8px] flex justify-center items-center h-[44px] rounded-[8px] bg-[#612BD3] ps-[20px] pe-[16px]"
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
              >
                Save Set
              </button>
            )}
            {!addEditSets && (
              <div ref={postNowRef} className="group cursor-pointer relative">
                <button
                  disabled={
                    selectedIntegrations.length === 0 || loading || locked
                  }
                  onClick={schedule('schedule')}
                  className="text-white relative min-w-[180px] btnSub disabled:cursor-not-allowed disabled:opacity-80 outline-none gap-[8px] flex justify-center items-center h-[44px] rounded-[8px] bg-[#612BD3] ps-[20px] pe-[16px]"
                >
                  {loading && (
                    <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                      <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
                    </div>
                  )}
                  <div
                    className={clsx(
                      'text-[15px] font-[600]',
                      loading && 'invisible'
                    )}
                  >
                    {selectedIntegrations.length === 0
                      ? t('check_circles_above', 'Check the circles above')
                      : scheduleLabel}
                  </div>
                  {!dummy && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPostNow(!showPostNow);
                      }}
                      className="flex justify-center items-center h-[20px] w-[20px] pt-[4px] arrow-change"
                    >
                      <DropdownArrowSmallIcon
                        className={clsx(
                          'group-hover:rotate-180 text-white',
                          showPostNow && 'rotate-180'
                        )}
                      />
                    </div>
                  )}
                </button>

                {!dummy && (
                  <button
                    onClick={schedule('now')}
                    disabled={
                      selectedIntegrations.length === 0 || loading || locked
                    }
                    className={clsx(
                      'rounded-[8px] z-[300] disabled:cursor-not-allowed disabled:opacity-80 absolute bottom-[100%] -left-[12px] p-[12px] w-[206px] bg-newBgColorInner',
                      showPostNow ? 'flex' : 'hidden group-hover:flex'
                    )}
                  >
                    <div className="text-white rounded-[8px] bg-[#D82D7E] h-[44px] w-full flex justify-center items-center post-now">
                      {t('post_now', 'Post Now')}
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {mobileSheet === 'channels' && (
        <BottomSheet
          title={t('select_channels', 'Select Channels')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done', 'Done'),
            onClick: () => setMobileSheet(null),
            disabled: selectedIntegrations.length === 0,
          }}
        >
          {!dummy && (
            <div className="flex pb-[8px] empty:hidden">
              <SelectCustomer
                onChange={changeCustomer}
                integrations={integrations}
              />
            </div>
          )}
          <PicksSocialsComponent list={true} />
        </BottomSheet>
      )}
      {mobileSheet === 'settings' && (
        <BottomSheet
          title={t('settings', 'Settings')}
          onClose={() => setMobileSheet(null)}
        >
          <div className="flex flex-col gap-[12px] pb-[30px]">
            {hasChannelSettings && (
              <BottomSheetRow
                icon={<SettingsOutlineIcon size={24} />}
                label={
                  current === 'global'
                    ? t('channels_settings', 'Channel Settings')
                    : `${integrations.find((p) => p.id === current)?.name} ${t(
                        'channel_settings',
                        'Settings'
                      )}`
                }
                onClick={() => {
                  setMobileSheet(null);
                  setShowSettings(true);
                }}
              />
            )}
            <BottomSheetRow
              icon={<TagIcon width={24} height={24} />}
              label={t('add_tag', 'Add Tag')}
              onClick={() => setMobileSheet('tags')}
            />
            <BottomSheetRow
              icon={<RepeatIcon size={24} />}
              label={t('repeat_post', 'Repeat Post')}
              onClick={() => setMobileSheet('repeat')}
            />
            {existingData?.integration && (
              <div
                onClick={deletePost}
                className="flex items-center gap-[12px] py-[8px] cursor-pointer text-[#FF3F3F]"
              >
                <TrashIcon size={24} />
                <div className="text-[15px] font-[600]">
                  {t('delete_post', 'Delete Post')}
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
      {mobileSheet === 'tags' && (
        <BottomSheet
          title={t('add_tag', 'Add Tag')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done', 'Done'),
            onClick: () => setMobileSheet(null),
          }}
        >
          <TagsComponent
            name="tags"
            label={t('tags', 'Tags')}
            initial={tags}
            onChange={(e) => {
              setTags(e.target.value);
            }}
            list={true}
          />
        </BottomSheet>
      )}
      {mobileSheet === 'date' && (
        <BottomSheet
          title={t('change_date_or_time', 'Change Date or Time')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('save', 'Save'),
            onClick: () => {
              setPickerDate(dateDraft);
              setMobileSheet(null);
            },
          }}
        >
          <DatePickerPanel
            date={dateDraft}
            onChange={setDateDraft}
            sheet={true}
          />
        </BottomSheet>
      )}
      {mobileSheet === 'repeat' && (
        <BottomSheet
          title={t('repeat_post', 'Repeat Post')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done', 'Done'),
            onClick: () => setMobileSheet(null),
          }}
        >
          <RepeatComponent
            repeat={repeater}
            onChange={setRepeater}
            list={true}
          />
        </BottomSheet>
      )}
      <CopilotPopup
        className="mobile:!z-[460] mobile:!bottom-[112px]"
        hitEscapeToClose={false}
        clickOutsideToClose={true}
        instructions={`
You are an assistant that help the user to schedule their social media posts,
Here are the things you can do:
- Add a new comment / post to the list of posts
- Delete a comment / post from the list of posts
- Add content to the comment / post
- Activate or deactivate the comment / post

Post content can be added using the addPostContentFor{num} function.
After using the addPostFor{num} it will create a new addPostContentFor{num+ 1} function.
`}
        labels={{
          title: t('your_assistant', 'Your Assistant'),
          initial: t(
            'assistant_initial_message',
            'Hi! I can help you to refine your social media posts.'
          ),
        }}
      />
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
