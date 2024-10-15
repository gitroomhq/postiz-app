'use client';

import React, {
  FC,
  Fragment,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import dayjs from 'dayjs';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import clsx from 'clsx';
import { usePreventWindowUnload } from '@gitroom/react/helpers/use.prevent.window.unload';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@mantine/modals';
import { useHideTopEditor } from '@gitroom/frontend/components/launches/helpers/use.hide.top.editor';
import { Button } from '@gitroom/react/form/button';
// @ts-ignore
import useKeypress from 'react-use-keypress';
import {
  getValues,
  resetValues,
} from '@gitroom/frontend/components/launches/helpers/use.values';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMoveToIntegration } from '@gitroom/frontend/components/launches/helpers/use.move.to.integration';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { useExpend } from '@gitroom/frontend/components/launches/helpers/use.expend';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { PickPlatforms } from '@gitroom/frontend/components/launches/helpers/pick.platform.component';
import { ProvidersOptions } from '@gitroom/frontend/components/launches/providers.options';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { UpDownArrow } from '@gitroom/frontend/components/launches/up.down.arrow';
import { DatePicker } from '@gitroom/frontend/components/launches/helpers/date.picker';
import { arrayMoveImmutable } from 'array-move';
import {
  Information,
  PostToOrganization,
} from '@gitroom/frontend/components/launches/post.to.organization';
import { Submitted } from '@gitroom/frontend/components/launches/submitted';
import { supportEmitter } from '@gitroom/frontend/components/layout/support';
import { Editor } from '@gitroom/frontend/components/launches/editor';
import { AddPostButton } from '@gitroom/frontend/components/launches/add.post.button';
import { useStateCallback } from '@gitroom/react/helpers/use.state.callback';
import { CopilotPopup } from '@copilotkit/react-ui';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import Image from 'next/image';

import { ReactComponent as RedBinSvg } from '@gitroom/frontend/assets/red-bin.svg';
import { ReactComponent as ArrowDownSvg } from '@gitroom/frontend/assets/arrow-down.svg';

export const AddEditModal: FC<{
  date: dayjs.Dayjs;
  integrations: Integrations[];
  reopenModal: () => void;
  mutate: () => void;
}> = (props) => {
  const { date, integrations, reopenModal, mutate } = props;
  const [dateState, setDateState] = useState(date);

  // hook to open a new modal
  const modal = useModals();

  // selected integrations to allow edit
  const [selectedIntegrations, setSelectedIntegrations] = useStateCallback<
    Integrations[]
  >([]);

  // value of each editor
  const [value, setValue] = useState<
    Array<{
      content: string;
      id?: string;
      image?: Array<{ id: string; path: string }>;
    }>
  >([{ content: '' }]);

  const fetch = useFetch();

  const user = useUser();

  const updateOrder = useCallback(() => {
    modal.closeAll();
    reopenModal();
  }, [reopenModal, modal]);

  // prevent the window exit by mistake
  usePreventWindowUnload(true);

  // hook to move the settings in the right place to fix missing fields
  const moveToIntegration = useMoveToIntegration();

  // hook to test if the top editor should be hidden
  const showHide = useHideTopEditor();

  const [showError, setShowError] = useState(false);

  // are we in edit mode?
  const existingData = useExistingData();

  // Post for
  const [postFor, setPostFor] = useState<Information | undefined>();

  const expend = useExpend();

  const toaster = useToaster();

  // if it's edit just set the current integration
  useEffect(() => {
    if (existingData.integration) {
      setSelectedIntegrations([
        integrations.find((p) => p.id === existingData.integration)!,
      ]);
    } else if (integrations.length === 1) {
      setSelectedIntegrations([integrations[0]]);
    }
  }, [existingData.integration]);

  // if the user exit the popup we reset the global variable with all the values
  useEffect(() => {
    supportEmitter.emit('change', false);

    return () => {
      supportEmitter.emit('change', true);
      resetValues();
    };
  }, []);

  // Change the value of the global editor
  const changeValue = useCallback(
    (index: number) => (newValue: string) => {
      return setValue((prev) => {
        prev[index].content = newValue;
        return [...prev];
      });
    },
    [value]
  );

  const changeImage = useCallback(
    (index: number) =>
      (newValue: {
        target: { name: string; value?: Array<{ id: string; path: string }> };
      }) => {
        return setValue((prev) => {
          return prev.map((p, i) => {
            if (i === index) {
              return { ...p, image: newValue.target.value };
            }
            return p;
          });
        });
      },
    []
  );

  // Add another editor
  const addValue = useCallback(
    (index: number) => () => {
      setValue((prev) => {
        return prev.reduce((acc, p, i) => {
          acc.push(p);
          if (i === index) {
            acc.push({ content: '' });
          }

          return acc;
        }, [] as Array<{ content: string }>);
      });
    },
    []
  );

  const changePosition = useCallback(
    (index: number) => (type: 'up' | 'down') => {
      if (type === 'up' && index !== 0) {
        setValue((prev) => {
          return arrayMoveImmutable(prev, index, index - 1);
        });
      } else if (type === 'down') {
        setValue((prev) => {
          return arrayMoveImmutable(prev, index, index + 1);
        });
      }
    },
    []
  );

  // Delete post
  const deletePost = useCallback(
    (index: number) => async () => {
      if (
        !(await deleteDialog(
          'Are you sure you want to delete this post?',
          'Yes, delete it!'
        ))
      ) {
        return;
      }
      setValue((prev) => {
        prev.splice(index, 1);
        return [...prev];
      });
    },
    [value]
  );

  // override the close modal to ask the user if he is sure to close
  const askClose = useCallback(async () => {
    if (
      await deleteDialog(
        'Are you sure you want to close this modal? (all data will be lost)',
        'Yes, close it!'
      )
    ) {
      modal.closeAll();
    }
  }, []);

  // sometimes it's easier to click escape to close
  useKeypress('Escape', askClose);

  const postNow = useCallback(
    ((e) => {
      e.stopPropagation();
      e.preventDefault();

      return schedule('now')();
    }) as MouseEventHandler<HTMLDivElement>,
    []
  );

  // function to send to the server and save
  const schedule = useCallback(
    (type: 'draft' | 'now' | 'schedule' | 'delete') => async () => {
      if (type === 'delete') {
        if (
          !(await deleteDialog(
            'Are you sure you want to delete this post?',
            'Yes, delete it!'
          ))
        ) {
          return;
        }
        await fetch(`/posts/${existingData.group}`, {
          method: 'DELETE',
        });
        mutate();
        modal.closeAll();
        return;
      }

      const values = getValues();

      const allKeys = Object.keys(values).map((v) => ({
        integration: integrations.find((p) => p.id === v),
        value: values[v].posts,
        valid: values[v].isValid,
        group: existingData?.group,
        trigger: values[v].trigger,
        settings: values[v].settings(),
        checkValidity: values[v].checkValidity,
        maximumCharacters: values[v].maximumCharacters,
      }));

      for (const key of allKeys) {
        if (key.checkValidity) {
          const check = await key.checkValidity(
            key?.value.map((p: any) => p.image || [])
          );
          if (typeof check === 'string') {
            toaster.show(check, 'warning');
            return;
          }
        }

        if (
          key.value.some(
            (p) => p.content.length > (key.maximumCharacters || 1000000)
          )
        ) {
          if (
            !(await deleteDialog(
              `${key?.integration?.name} post is too long, it will be cropped, do you want to continue?`,
              'Yes, continue'
            ))
          ) {
            await key.trigger();
            moveToIntegration({
              identifier: key?.integration?.id!,
              toPreview: true,
            });
            return;
          }
        }

        if (key.value.some((p) => !p.content || p.content.length < 6)) {
          setShowError(true);
          return;
        }

        if (!key.valid) {
          await key.trigger();
          moveToIntegration({ identifier: key?.integration?.id! });
          return;
        }
      }

      await fetch('/posts', {
        method: 'POST',
        body: JSON.stringify({
          ...(postFor ? { order: postFor.id } : {}),
          type,
          date: dateState.utc().format('YYYY-MM-DDTHH:mm:ss'),
          posts: allKeys.map((p) => ({
            ...p,
            value: p.value.map((a) => ({
              ...a,
              content: a.content.slice(0, p.maximumCharacters || 1000000),
            })),
          })),
        }),
      });

      existingData.group = makeId(10);

      mutate();
      toaster.show(
        !existingData.integration
          ? 'Added successfully'
          : 'Updated successfully'
      );
      modal.closeAll();
    },
    [
      postFor,
      dateState,
      value,
      integrations,
      existingData,
      selectedIntegrations,
    ]
  );

  const getPostsMarketplace = useCallback(async () => {
    return (
      await fetch(`/posts/marketplace/${existingData?.posts?.[0]?.id}`)
    ).json();
  }, []);

  const { data } = useSWR(
    `/posts/marketplace/${existingData?.posts?.[0]?.id}`,
    getPostsMarketplace
  );

  const canSendForPublication = useMemo(() => {
    if (!postFor) {
      return true;
    }

    return selectedIntegrations.every((integration) => {
      const find = postFor.missing.find(
        (p) => p.integration.integration.id === integration.id
      );

      if (!find) {
        return false;
      }

      return find.missing !== 0;
    });
  }, [data, postFor, selectedIntegrations]);

  return (
    <>
      {user?.tier?.ai && (
        <CopilotPopup
          hitEscapeToClose={false}
          clickOutsideToClose={true}
          labels={{
            title: 'AI Content Assistant',
          }}
          className="!z-[499]"
          instructions="You are an assistant that help the user to schedule their social media posts, everytime somebody write something, try to use a function call, if not prompt the user that the request is invalid and you are here to assists with social media posts"
        />
      )}
      <div
        className={clsx('flex p-[10px] rounded-[4px] bg-primary gap-[20px]')}
      >
        <div
          className={clsx(
            'flex flex-col gap-[16px] transition-all duration-700 whitespace-nowrap',
            !expend.expend
              ? 'flex-1 w-1 animate-overflow'
              : 'w-0 overflow-hidden'
          )}
        >
          <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
            <TopTitle title={existingData?.group ? 'Edit Post' : 'Create Post'}>
              <div className="flex items-center">
                <PostToOrganization
                  selected={existingData?.posts?.[0]?.submittedForOrderId!}
                  information={data}
                  onChange={setPostFor}
                />
                <DatePicker onChange={setDateState} date={dateState} />
              </div>
            </TopTitle>

            {!existingData.integration && integrations.length > 1 ? (
              <PickPlatforms
                integrations={integrations.filter((f) => !f.disabled)}
                selectedIntegrations={[]}
                singleSelect={false}
                onChange={setSelectedIntegrations}
                isMain={true}
              />
            ) : (
              <div
                className={clsx(
                  'relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500'
                )}
              >
                <Image
                  src={selectedIntegrations?.[0]?.picture}
                  className="rounded-full"
                  alt={selectedIntegrations?.[0]?.identifier}
                  width={32}
                  height={32}
                />
                {selectedIntegrations?.[0]?.identifier === 'youtube' ? (
                  <img
                    src="/icons/platforms/youtube.svg"
                    className="absolute z-10 -bottom-[5px] -right-[5px]"
                    width={20}
                  />
                ) : (
                  <Image
                    src={`/icons/platforms/${selectedIntegrations?.[0]?.identifier}.png`}
                    className="rounded-full absolute z-10 -bottom-[5px] -right-[5px] border border-fifth"
                    alt={selectedIntegrations?.[0]?.identifier}
                    width={20}
                    height={20}
                  />
                )}
              </div>
            )}
            <div
              id="renderEditor"
              className={clsx(!showHide.hideTopEditor && 'hidden')}
            />
            {!existingData.integration && !showHide.hideTopEditor ? (
              <>
                <div>You are in global editing mode</div>
                {value.map((p, index) => (
                  <Fragment key={`edit_${index}`}>
                    <div>
                      <div className="flex gap-[4px]">
                        <div className="flex-1 editor text-textColor">
                          <Editor
                            order={index}
                            height={value.length > 1 ? 150 : 250}
                            commands={
                              [
                                // ...commands
                                //   .getCommands()
                                //   .filter((f) => f.name === 'image'),
                                // newImage,
                                // postSelector(dateState),
                              ]
                            }
                            value={p.content}
                            preview="edit"
                            // @ts-ignore
                            onChange={changeValue(index)}
                          />

                          {showError &&
                            (!p.content || p.content.length < 6) && (
                              <div className="my-[5px] text-customColor19 text-[12px] font-[500]">
                                The post should be at least 6 characters long
                              </div>
                            )}
                          <div className="flex">
                            <div className="flex-1">
                              <MultiMediaComponent
                                label="Attachments"
                                description=""
                                value={p.image}
                                name="image"
                                onChange={changeImage(index)}
                              />
                            </div>
                            <div className="flex bg-customColor20 rounded-br-[8px] text-customColor19">
                              {value.length > 1 && (
                                <div
                                  className="flex cursor-pointer gap-[4px] justify-center items-center flex-1"
                                  onClick={deletePost(index)}
                                >
                                  <div>
                                    <RedBinSvg />
                                  </div>
                                  <div className="text-[12px] font-[500] pr-[10px]">
                                    Delete Post
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <UpDownArrow
                            isUp={index !== 0}
                            isDown={
                              value.length !== 0 && value.length !== index + 1
                            }
                            onChange={changePosition(index)}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <AddPostButton num={index} onClick={addValue(index)} />
                    </div>
                  </Fragment>
                ))}
              </>
            ) : null}
          </div>
          <div className="relative h-[68px] flex flex-col rounded-[4px] border border-customColor6 bg-sixth">
            <div className="flex flex-1 gap-[10px] relative">
              <div className="absolute w-full h-full flex gap-[10px] justify-end items-center right-[16px]">
                <Button
                  className="bg-transparent text-inputText"
                  onClick={askClose}
                >
                  Cancel
                </Button>
                <Submitted
                  updateOrder={updateOrder}
                  postId={existingData?.posts?.[0]?.id}
                  status={existingData?.posts?.[0]?.approvedSubmitForOrder}
                >
                  {!!existingData.integration && (
                    <Button
                      onClick={schedule('delete')}
                      className="rounded-[4px] border-2 border-red-400 text-red-400"
                      secondary={true}
                    >
                      Delete Post
                    </Button>
                  )}
                  <Button
                    onClick={schedule('draft')}
                    className="rounded-[4px] border-2 border-customColor21"
                    secondary={true}
                    disabled={selectedIntegrations.length === 0}
                  >
                    Save as draft
                  </Button>

                  <Button
                    onClick={schedule('schedule')}
                    className="rounded-[4px] relative group"
                    disabled={
                      selectedIntegrations.length === 0 ||
                      !canSendForPublication
                    }
                  >
                    <div className="flex justify-center items-center gap-[5px] h-full">
                      <div className="h-full flex items-center text-white">
                        {!canSendForPublication
                          ? 'Not matching order'
                          : postFor
                          ? 'Submit for order'
                          : !existingData.integration
                          ? 'Add to calendar'
                          : 'Update'}
                      </div>
                      {!postFor && (
                        <div className="h-full flex items-center">
                          <ArrowDownSvg />
                          <div
                            onClick={postNow}
                            className="hidden group-hover:flex hover:flex flex-col justify-center absolute left-0 top-[100%] w-full h-[40px] bg-customColor22 border border-tableBorder"
                          >
                            Post now
                          </div>
                        </div>
                      )}
                    </div>
                  </Button>
                </Submitted>
              </div>
            </div>
          </div>
        </div>
        <div
          className={clsx(
            'flex gap-[20px] flex-col rounded-[4px] border-customColor6 bg-sixth flex-1 transition-all duration-700',
            !selectedIntegrations.length
              ? 'flex-grow-0 overflow-hidden'
              : 'flex-grow-1 border animate-overflow'
          )}
        >
          <div className="mx-[16px]">
            <TopTitle
              title=""
              expend={expend.show}
              collapse={expend.hide}
              shouldExpend={expend.expend}
            />
          </div>
          {!!selectedIntegrations.length && (
            <div className="flex-1 flex flex-col p-[16px] pt-0">
              <ProvidersOptions
                integrations={selectedIntegrations}
                editorValue={value}
                date={dateState}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
