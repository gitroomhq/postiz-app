'use client';

import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
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
import { useShallow } from 'zustand/react/shallow';
import { RepeatComponent } from '@gitroom/frontend/components/launches/repeat.component';
import { TagsComponent } from '@gitroom/frontend/components/launches/tags.component';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { weightedLength } from '@gitroom/helpers/utils/count.length';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { capitalize } from 'lodash';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { CopilotPopup } from '@copilotkit/react-ui';
import { DummyCodeComponent } from '@gitroom/frontend/components/new-launch/dummy.code.component';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';

function countCharacters(text: string, type: string): number {
  if (type !== 'x') {
    return text.length;
  }
  return weightedLength(text);
}

export const ManageModal: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const ref = useRef(null);
  const existingData = useExistingData();
  const [loading, setLoading] = useState(false);
  const toaster = useToaster();
  const modal = useModals();
  const [showSettings, setShowSettings] = useState(false);

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
  } = useLaunchStore(
    useShallow((state) => ({
      hide: state.hide,
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

  const currentIntegrationText = useMemo(() => {
    if (current === 'global') {
      return '';
    }

    const currentIntegration = integrations.find((p) => p.id === current)!;

    return `${currentIntegration.name} (${capitalize(
      currentIntegration.identifier.split('-').shift()
    )})`;
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
    if (
      !(await deleteDialog(
        'Are you sure you want to delete this post?',
        'Yes, delete it!'
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
    (type: 'draft' | 'now' | 'schedule') => async () => {
      setLoading(true);
      const checkAllValid = await ref.current.checkAllValid();
      if (type !== 'draft') {
        const notEnoughChars = checkAllValid.filter((p: any) => {
          return p.values.some((a: any) => {
            return (
              countCharacters(
                stripHtmlValidation('normal', a.content, true),
                p?.integration?.identifier || ''
              ) === 0 && a.media?.length === 0
            );
          });
        });

        for (const item of notEnoughChars) {
          toaster.show(
            '' +
              item.integration.name +
              ' Your post should have at least one character or one image.',
            'warning'
          );
          setLoading(false);
          item.preview();
          return;
        }

        for (const item of checkAllValid) {
          if (item.valid === false) {
            toaster.show('Please fix your settings', 'warning');
            item.fix();
            setLoading(false);
            setShowSettings(true);
            return;
          }

          if (item.errors !== true) {
            toaster.show(
              `${capitalize(item.integration.identifier.split('-')[0])} (${
                item.integration.name
              }): ${item.errors}`,
              'warning'
            );
            item.preview();
            setLoading(false);
            setShowSettings(true);
            return;
          }
        }

        const sliceNeeded = checkAllValid.filter((p: any) => {
          return p.values.some((a: any) => {
            const strip = stripHtmlValidation('normal', a.content, true);
            const weightedLength = countCharacters(
              strip,
              p?.integration?.identifier || ''
            );
            const totalCharacters =
              weightedLength > strip.length ? weightedLength : strip.length;

            return totalCharacters > (p.maximumCharacters || 1000000);
          });
        });

        for (const item of sliceNeeded) {
          toaster.show(
            `${item?.integration?.name} (${item?.integration?.identifier}) post is too long, please fix it`,
            'warning'
          );
          item.preview();
          setLoading(false);
          return;
        }
      }

      const shortLinkUrl = dummy
        ? { ask: false }
        : await (
            await fetch('/posts/should-shortlink', {
              method: 'POST',
              body: JSON.stringify({
                messages: checkAllValid.flatMap((p: any) =>
                  p.values.flatMap((a: any) => a.content)
                ),
              }),
            })
          ).json();

      const shortLink = !shortLinkUrl.ask
        ? false
        : await deleteDialog(
            'Do you want to shortlink the URLs? it will let you get statistics over clicks',
            'Yes, shortlink it!'
          );

      const group = existingData.group || makeId(10);
      const data = {
        type,
        ...(repeater ? { inter: repeater } : {}),
        tags,
        shortLink,
        date: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts: checkAllValid.map((post: any) => ({
          integration: {
            id: post.integration.id,
          },
          group,
          settings: { ...(post.settings || {}) },
          value: post.values.map((value: any) => ({
            ...(value.id ? { id: value.id } : {}),
            content: value.content,
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
        })),
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
        addEditSets
          ? addEditSets(data)
          : await fetch('/posts', {
              method: 'POST',
              body: JSON.stringify(data),
            });

        if (!addEditSets) {
          mutate();
          toaster.show(
            !existingData.integration
              ? 'Added successfully'
              : 'Updated successfully'
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
    [ref, repeater, tags, date, addEditSets, dummy]
  );

  return (
    <div className="w-full h-full flex-1 p-[40px] flex relative">
      <div className="flex flex-1 bg-newBgColorInner rounded-[20px] flex-col">
        <div className="flex-1 flex">
          <div className="flex flex-col flex-1 border-r border-newBorder">
            <div className="bg-newBgColor h-[65px] rounded-tl-[20px] flex items-center px-[20px] text-[20px] font-[600]">
              Create Post
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <div className="flex-1 relative">
                <div
                  id="social-content"
                  className="gap-[32px] flex flex-col pr-[8px] pt-[20px] pl-[20px] absolute top-0 left-0 w-full h-full overflow-x-hidden overflow-y-scroll scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
                >
                  <div className="flex w-full">
                    <div className="flex flex-1">
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
                    <div>{!existingData.integration && <SelectCurrent />}</div>
                    <div className="flex-1 flex">
                      {!hide && <EditorWrapper totalPosts={1} value="" />}
                    </div>
                    <div
                      id="social-empty"
                      className={clsx(
                        'pb-[16px]',
                        current !== 'global' && 'hidden'
                      )}
                    />
                  </div>
                </div>
              </div>
              <div
                id="wrapper-settings"
                className={clsx(
                  'pb-[20px] px-[20px] select-none',
                  current === 'global' && 'hidden'
                )}
              >
                <div className="bg-newSettings flex flex-col rounded-[12px] gap-[12px]">
                  <div
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                      'bg-[#612BD3] rounded-[12px] flex items-center gap-[8px] cursor-pointer p-[12px]',
                      showSettings ? '!rounded-b-none' : ''
                    )}
                  >
                    <div className="flex">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M7.82888 16.1429L8.31591 17.2383C8.4607 17.5644 8.69698 17.8414 8.9961 18.0358C9.29522 18.2303 9.64434 18.3337 10.0011 18.3337C10.3579 18.3337 10.707 18.2303 11.0061 18.0358C11.3052 17.8414 11.5415 17.5644 11.6863 17.2383L12.1733 16.1429C12.3467 15.7542 12.6383 15.4302 13.0067 15.217C13.3773 15.0032 13.8061 14.9121 14.2317 14.9568L15.4233 15.0837C15.778 15.1212 16.136 15.055 16.4539 14.8931C16.7717 14.7312 17.0358 14.4806 17.2141 14.1716C17.3925 13.8628 17.4776 13.5089 17.4588 13.1527C17.4401 12.7966 17.3184 12.4535 17.1085 12.1651L16.403 11.1957C16.1517 10.8479 16.0175 10.4293 16.0196 10.0003C16.0195 9.57248 16.155 9.15562 16.4067 8.80959L17.1122 7.84014C17.3221 7.55179 17.4438 7.20872 17.4625 6.85255C17.4813 6.49639 17.3962 6.14244 17.2178 5.83366C17.0395 5.52469 16.7754 5.27407 16.4576 5.11218C16.1397 4.9503 15.7817 4.8841 15.427 4.92162L14.2354 5.04847C13.8098 5.09317 13.381 5.00209 13.0104 4.78829C12.6413 4.57387 12.3496 4.24812 12.177 3.85773L11.6863 2.76236C11.5415 2.4363 11.3052 2.15925 11.0061 1.96482C10.707 1.77039 10.3579 1.66693 10.0011 1.66699C9.64434 1.66693 9.29522 1.77039 8.9961 1.96482C8.69698 2.15925 8.4607 2.4363 8.31591 2.76236L7.82888 3.85773C7.65632 4.24812 7.3646 4.57387 6.99554 4.78829C6.62489 5.00209 6.1961 5.09317 5.77054 5.04847L4.57517 4.92162C4.22045 4.8841 3.86246 4.9503 3.5446 5.11218C3.22675 5.27407 2.96269 5.52469 2.78443 5.83366C2.60595 6.14244 2.52092 6.49639 2.53965 6.85255C2.55839 7.20872 2.68009 7.55179 2.88999 7.84014L3.59554 8.80959C3.84716 9.15562 3.98266 9.57248 3.98258 10.0003C3.98266 10.4282 3.84716 10.845 3.59554 11.1911L2.88999 12.1605C2.68009 12.4489 2.55839 12.7919 2.53965 13.1481C2.52092 13.5043 2.60595 13.8582 2.78443 14.167C2.96286 14.4758 3.22696 14.7263 3.54476 14.8882C3.86257 15.05 4.22047 15.1163 4.57517 15.079L5.76684 14.9522C6.1924 14.9075 6.62119 14.9986 6.99184 15.2124C7.36228 15.4262 7.65535 15.752 7.82888 16.1429Z"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.99961 12.5003C11.3803 12.5003 12.4996 11.381 12.4996 10.0003C12.4996 8.61961 11.3803 7.50033 9.99961 7.50033C8.6189 7.50033 7.49961 8.61961 7.49961 10.0003C7.49961 11.381 8.6189 12.5003 9.99961 12.5003Z"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 text-[14px] font-[600] text-white">
                      {currentIntegrationText} Settings
                    </div>
                    <div>
                      <svg
                        className={clsx(
                          showSettings && 'rotate-180',
                          'transition-transform'
                        )}
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div
                    id="social-settings"
                    className={clsx(
                      !showSettings && 'hidden',
                      'px-[12px] pb-[12px] text-[14px] text-textColor font-[500] max-h-[400px] overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner'
                    )}
                  />
                  <style>
                    {`#social-settings [data-id="${current}"] {display: block !important;}`}
                  </style>
                </div>
              </div>
            </div>
          </div>
          <div className="w-[580px] flex flex-col">
            <div className="bg-newBgColor h-[65px] rounded-tr-[20px] flex items-center px-[20px] text-[20px] font-[600]">
              <div className="flex-1">Post Preview</div>
              <div className="cursor-pointer">
                <svg
                  onClick={askClose}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M16 4L4 16M4 4L16 16"
                    stroke="#A3A3A3"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute top-0 p-[20px] left-0 w-full h-full overflow-x-hidden overflow-y-scroll scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner">
                <ShowAllProviders ref={ref} />
              </div>
            </div>
          </div>
        </div>
        <div className="select-none h-[84px] py-[20px] border-t border-newBorder flex items-center">
          <div className="flex-1 flex pl-[20px] gap-[8px]">
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
          <div className="pr-[20px] flex items-center justify-end gap-[8px]">
            {existingData?.integration && (
              <button onClick={deletePost} className="cursor-pointer flex text-[#FF3F3F] gap-[8px] items-center text-[15px] font-[600]">
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M7.5 2.5H12.5M2.5 5H17.5M15.8333 5L15.2489 13.7661C15.1612 15.0813 15.1174 15.7389 14.8333 16.2375C14.5833 16.6765 14.206 17.0294 13.7514 17.2497C13.235 17.5 12.5759 17.5 11.2578 17.5H8.74221C7.42409 17.5 6.76503 17.5 6.24861 17.2497C5.79396 17.0294 5.41674 16.6765 5.16665 16.2375C4.88259 15.7389 4.83875 15.0813 4.75107 13.7661L4.16667 5M8.33333 8.75V12.9167M11.6667 8.75V12.9167"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>Delete Post</div>
              </button>
            )}
            <DatePicker onChange={setDate} date={date} />
            {!addEditSets && (
              <button
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
                className="cursor-pointer disabled:cursor-not-allowed px-[20px] h-[44px] bg-btnSimple justify-center items-center flex rounded-[8px] text-[15px] font-[600]"
              >
                Save as Draft
              </button>
            )}
            {addEditSets && (
              <button
                className="text-white text-[15px] font-[600] min-w-[180px] btnSub disabled:cursor-not-allowed disabled:opacity-80 outline-none gap-[8px] flex justify-center items-center h-[44px] rounded-[8px] bg-[#612BD3] pl-[20px] pr-[16px]"
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
              >
                Save Set
              </button>
            )}
            {!addEditSets && (
              <div className="group cursor-pointer relative">
                <button
                  disabled={
                    selectedIntegrations.length === 0 || loading || locked
                  }
                  onClick={schedule('schedule')}
                  className="text-white min-w-[180px] btnSub disabled:cursor-not-allowed disabled:opacity-80 outline-none gap-[8px] flex justify-center items-center h-[44px] rounded-[8px] bg-[#612BD3] pl-[20px] pr-[16px]"
                >
                  <div className="text-[15px] font-[600]">
                    {selectedIntegrations.length === 0
                      ? 'Check the circles above'
                      : dummy
                      ? 'Create output'
                      : !existingData?.integration
                      ? t('add_to_calendar', 'Add to calendar')
                      : existingData?.posts?.[0]?.state === 'DRAFT'
                      ? t('schedule', 'Schedule')
                      : t('update', 'Update')}
                  </div>
                  <div className="flex justify-center items-center h-[20px] w-[20px] pt-[4px] arrow-change">
                    <svg
                      className="group-hover:rotate-180 transition-transform"
                      xmlns="http://www.w3.org/2000/svg"
                      width="6"
                      height="4"
                      viewBox="0 0 6 4"
                      fill="none"
                    >
                      <path
                        d="M0.456301 9.69291e-07L5.5437 7.97823e-08C5.94941 8.84616e-09 6.15259 0.567978 5.86571 0.90016L3.32201 3.84556C3.14417 4.05148 2.85583 4.05148 2.67799 3.84556L0.134293 0.900162C-0.152585 0.56798 0.0505934 1.04023e-06 0.456301 9.69291e-07Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={schedule('now')}
                  disabled={
                    selectedIntegrations.length === 0 || loading || locked
                  }
                  className="disabled:cursor-not-allowed disabled:opacity-80 hidden group-hover:flex absolute bottom-[100%] -left-[12px] p-[12px] w-[206px] bg-newBgColorInner"
                >
                  <div className="text-white rounded-[8px] bg-[#D82D7E] h-[44px] w-full flex justify-center items-center post-now">
                    Post Now
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <CopilotPopup
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
          title: 'Your Assistant',
          initial: 'Hi! I can help you to refine your social media posts.',
        }}
      />
    </div>
  );
};
export const ManageModalA: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const ref = useRef(null);
  const existingData = useExistingData();
  const [loading, setLoading] = useState(false);
  const toaster = useToaster();
  const modal = useModals();

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
    activateExitButton,
  } = useLaunchStore(
    useShallow((state) => ({
      hide: state.hide,
      date: state.date,
      setDate: state.setDate,
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

  const deletePost = useCallback(async () => {
    setLoading(true);
    if (
      !(await deleteDialog(
        'Are you sure you want to delete this post?',
        'Yes, delete it!'
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

  const schedule = useCallback(
    (type: 'draft' | 'now' | 'schedule') => async () => {
      setLoading(true);
      const checkAllValid = await ref.current.checkAllValid();
      if (type !== 'draft') {
        const notEnoughChars = checkAllValid.filter((p: any) => {
          return p.values.some((a: any) => {
            return (
              countCharacters(
                stripHtmlValidation('normal', a.content, true),
                p?.integration?.identifier || ''
              ) === 0 && a.media?.length === 0
            );
          });
        });

        for (const item of notEnoughChars) {
          toaster.show(
            '' +
              item.integration.name +
              ' Your post should have at least one character or one image.',
            'warning'
          );
          setLoading(false);
          item.preview();
          return;
        }

        for (const item of checkAllValid) {
          if (item.valid === false) {
            toaster.show('Some fields are not valid', 'warning');
            item.fix();
            setLoading(false);
            return;
          }

          if (item.errors !== true) {
            toaster.show(
              `${capitalize(item.integration.identifier.split('-')[0])} (${
                item.integration.name
              }): ${item.errors}`,
              'warning'
            );
            item.preview();
            setLoading(false);
            return;
          }
        }

        const sliceNeeded = checkAllValid.filter((p: any) => {
          return p.values.some((a: any) => {
            const strip = stripHtmlValidation('normal', a.content, true);
            const weightedLength = countCharacters(
              strip,
              p?.integration?.identifier || ''
            );
            const totalCharacters =
              weightedLength > strip.length ? weightedLength : strip.length;

            return totalCharacters > (p.maximumCharacters || 1000000);
          });
        });

        for (const item of sliceNeeded) {
          toaster.show(
            `${item?.integration?.name} (${item?.integration?.identifier}) post is too long, please fix it`,
            'warning'
          );
          item.preview();
          setLoading(false);
          return;
        }
      }

      const shortLinkUrl = dummy
        ? { ask: false }
        : await (
            await fetch('/posts/should-shortlink', {
              method: 'POST',
              body: JSON.stringify({
                messages: checkAllValid.flatMap((p: any) =>
                  p.values.flatMap((a: any) => a.content)
                ),
              }),
            })
          ).json();

      const shortLink = !shortLinkUrl.ask
        ? false
        : await deleteDialog(
            'Do you want to shortlink the URLs? it will let you get statistics over clicks',
            'Yes, shortlink it!'
          );

      const group = existingData.group || makeId(10);
      const data = {
        type,
        ...(repeater ? { inter: repeater } : {}),
        tags,
        shortLink,
        date: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts: checkAllValid.map((post: any) => ({
          integration: {
            id: post.integration.id,
          },
          group,
          settings: { ...(post.settings || {}) },
          value: post.values.map((value: any) => ({
            ...(value.id ? { id: value.id } : {}),
            content: value.content,
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
        })),
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
        addEditSets
          ? addEditSets(data)
          : await fetch('/posts', {
              method: 'POST',
              body: JSON.stringify(data),
            });

        if (!addEditSets) {
          mutate();
          toaster.show(
            !existingData.integration
              ? 'Added successfully'
              : 'Updated successfully'
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
    [ref, repeater, tags, date, addEditSets, dummy]
  );

  return (
    <>
      <div
        className={clsx(
          'flex flex-col md:flex-row bg-newBgLineColor gap-[1px] rounded-[24px] trz'
        )}
      >
        <div
          className={clsx(
            'flex flex-1 flex-col gap-[16px] transition-all duration-700 whitespace-nowrap bg-newBgColorInner rounded-s-[24px]'
          )}
        >
          <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] p-[24px] pt-0">
            <TopTitle
              extraClass="h-[75px]"
              titleSize="text-[24px]"
              title={
                dummy
                  ? 'Generate an API request'
                  : existingData.integration
                  ? t('update_post', 'Update Existing Post')
                  : t('create_new_post', 'Create Post')
              }
            >
              <div className="flex items-center">
                {!dummy && (
                  <RepeatComponent repeat={repeater} onChange={setRepeater} />
                )}
                <DatePicker onChange={setDate} date={date} />
              </div>
            </TopTitle>

            <PicksSocialsComponent toolTip={true} />
            <div>
              {!existingData.integration && <SelectCurrent />}
              <div className="flex gap-[4px]">
                <div className="flex-1 editor text-textColor gap-[10px] flex-col flex">
                  {!hide && <EditorWrapper totalPosts={1} value="" />}
                </div>
              </div>
            </div>
          </div>
          <div className="relative min-h-[68px] flex flex-col rounded-[4px]">
            <div className="gap-[10px] relative flex flex-col justify-center items-center min-h-full px-[24px]">
              <div
                id="add-edit-post-dialog-buttons"
                className="flex flex-row flex-wrap w-full h-full gap-[10px] justify-end items-center"
              >
                <div className="flex justify-center items-center gap-[5px] h-full">
                  {!!existingData.integration && (
                    <Button
                      onClick={deletePost}
                      className="rounded-[4px] border-2 border-red-400 text-red-400"
                      secondary={true}
                      disabled={loading || locked}
                    >
                      {t('delete_post', 'Delete Post')}
                    </Button>
                  )}

                  {!addEditSets && !dummy && (
                    <Button
                      onClick={schedule('draft')}
                      className="rounded-[4px] border-2 border-customColor21"
                      secondary={true}
                      disabled={
                        selectedIntegrations.length === 0 || loading || locked
                      }
                    >
                      {t('save_as_draft', 'Save as draft')}
                    </Button>
                  )}

                  {addEditSets && (
                    <Button
                      className="rounded-[4px] relative group"
                      disabled={
                        selectedIntegrations.length === 0 || loading || locked
                      }
                      onClick={schedule('draft')}
                    >
                      Save Set
                    </Button>
                  )}
                  {!addEditSets && (
                    <Button
                      className="rounded-[4px] relative group"
                      disabled={
                        selectedIntegrations.length === 0 || loading || locked
                      }
                    >
                      <div className="flex justify-center items-center gap-[5px] h-full">
                        <div
                          className="h-full flex items-center text-white"
                          onClick={schedule('schedule')}
                        >
                          {selectedIntegrations.length === 0
                            ? t(
                                'select_channels_from_circles',
                                'Select channels from the circles above'
                              )
                            : dummy
                            ? 'Create output'
                            : !existingData?.integration
                            ? t('add_to_calendar', 'Add to calendar')
                            : existingData?.posts?.[0]?.state === 'DRAFT'
                            ? t('schedule', 'Schedule')
                            : t('update', 'Update')}
                        </div>
                        {!dummy && (
                          <div className="h-full flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 18 18"
                              fill="none"
                            >
                              <path
                                d="M15.0233 7.14804L9.39828 12.773C9.34604 12.8253 9.284 12.8668 9.21572 12.8951C9.14743 12.9234 9.07423 12.938 9.00031 12.938C8.92639 12.938 8.8532 12.9234 8.78491 12.8951C8.71662 12.8668 8.65458 12.8253 8.60234 12.773L2.97734 7.14804C2.8718 7.04249 2.8125 6.89934 2.8125 6.75007C2.8125 6.6008 2.8718 6.45765 2.97734 6.3521C3.08289 6.24655 3.22605 6.18726 3.37531 6.18726C3.52458 6.18726 3.66773 6.24655 3.77328 6.3521L9.00031 11.5798L14.2273 6.3521C14.2796 6.29984 14.3417 6.25838 14.4099 6.2301C14.4782 6.20181 14.5514 6.18726 14.6253 6.18726C14.6992 6.18726 14.7724 6.20181 14.8407 6.2301C14.909 6.25838 14.971 6.29984 15.0233 6.3521C15.0755 6.40436 15.117 6.46641 15.1453 6.53469C15.1736 6.60297 15.1881 6.67616 15.1881 6.75007C15.1881 6.82398 15.1736 6.89716 15.1453 6.96545C15.117 7.03373 15.0755 7.09578 15.0233 7.14804Z"
                                fill="white"
                              />
                            </svg>
                            <div
                              onClick={schedule('now')}
                              className={clsx(
                                'hidden group-hover:flex hover:flex flex-col justify-center absolute start-0 top-[100%] w-full h-[40px] bg-customColor22 border border-tableBorder',
                                (locked || loading) &&
                                  'cursor-not-allowed pointer-events-none opacity-50'
                              )}
                            >
                              {t('post_now', 'Post now')}
                            </div>
                          </div>
                        )}
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className={clsx(
            'px-[24px] flex-grow rounded-e-[24px] w-[650px] max-w-[650px] min-w-[650px] flex gap-[20px] flex-col rounded-[4px] bg-newBgColorInner border-newBgLineColor flex-1 transition-all duration-700'
          )}
        >
          <div>
            <TopTitle title="" removeTitle={true} extraClass="h-[75px]">
              <div className="flex flex-1 gap-[10px]">
                <div>
                  {!dummy && (
                    <TagsComponent
                      name="tags"
                      label={t('tags', 'Tags')}
                      initial={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  )}
                </div>
                {!dummy && (
                  <SelectCustomer
                    onChange={changeCustomer}
                    integrations={integrations}
                  />
                )}
              </div>
              <svg
                onClick={askClose}
                width="10"
                height="11"
                viewBox="0 0 10 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="cursor-pointer"
              >
                <path
                  d="M9.85403 9.64628C9.90048 9.69274 9.93733 9.74789 9.96247 9.80859C9.98762 9.86928 10.0006 9.93434 10.0006 10C10.0006 10.0657 9.98762 10.1308 9.96247 10.1915C9.93733 10.2522 9.90048 10.3073 9.85403 10.3538C9.80757 10.4002 9.75242 10.4371 9.69173 10.4622C9.63103 10.4874 9.56598 10.5003 9.50028 10.5003C9.43458 10.5003 9.36953 10.4874 9.30883 10.4622C9.24813 10.4371 9.19298 10.4002 9.14653 10.3538L5.00028 6.20691L0.854028 10.3538C0.760208 10.4476 0.63296 10.5003 0.500278 10.5003C0.367596 10.5003 0.240348 10.4476 0.146528 10.3538C0.0527077 10.26 2.61548e-09 10.1327 0 10C-2.61548e-09 9.86735 0.0527077 9.7401 0.146528 9.64628L4.2934 5.50003L0.146528 1.35378C0.0527077 1.25996 0 1.13272 0 1.00003C0 0.867352 0.0527077 0.740104 0.146528 0.646284C0.240348 0.552464 0.367596 0.499756 0.500278 0.499756C0.63296 0.499756 0.760208 0.552464 0.854028 0.646284L5.00028 4.79316L9.14653 0.646284C9.24035 0.552464 9.3676 0.499756 9.50028 0.499756C9.63296 0.499756 9.76021 0.552464 9.85403 0.646284C9.94785 0.740104 10.0006 0.867352 10.0006 1.00003C10.0006 1.13272 9.94785 1.25996 9.85403 1.35378L5.70715 5.50003L9.85403 9.64628Z"
                  fill="currentColor"
                />
              </svg>
            </TopTitle>
          </div>
          <div className="flex-1 flex flex-col pt-0 pb-[24px]">
            <ShowAllProviders ref={ref} />
          </div>
        </div>
      </div>
    </>
  );
};
