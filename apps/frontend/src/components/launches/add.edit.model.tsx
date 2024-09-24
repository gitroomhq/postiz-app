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
                  'relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500',
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
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="14"
                                      height="14"
                                      viewBox="0 0 14 14"
                                      fill="currentColor"
                                    >
                                      <path
                                        d="M11.8125 2.625H9.625V2.1875C9.625 1.8394 9.48672 1.50556 9.24058 1.25942C8.99444 1.01328 8.6606 0.875 8.3125 0.875H5.6875C5.3394 0.875 5.00556 1.01328 4.75942 1.25942C4.51328 1.50556 4.375 1.8394 4.375 2.1875V2.625H2.1875C2.07147 2.625 1.96019 2.67109 1.87814 2.75314C1.79609 2.83519 1.75 2.94647 1.75 3.0625C1.75 3.17853 1.79609 3.28981 1.87814 3.37186C1.96019 3.45391 2.07147 3.5 2.1875 3.5H2.625V11.375C2.625 11.6071 2.71719 11.8296 2.88128 11.9937C3.04538 12.1578 3.26794 12.25 3.5 12.25H10.5C10.7321 12.25 10.9546 12.1578 11.1187 11.9937C11.2828 11.8296 11.375 11.6071 11.375 11.375V3.5H11.8125C11.9285 3.5 12.0398 3.45391 12.1219 3.37186C12.2039 3.28981 12.25 3.17853 12.25 3.0625C12.25 2.94647 12.2039 2.83519 12.1219 2.75314C12.0398 2.67109 11.9285 2.625 11.8125 2.625ZM5.25 2.1875C5.25 2.07147 5.29609 1.96019 5.37814 1.87814C5.46019 1.79609 5.57147 1.75 5.6875 1.75H8.3125C8.42853 1.75 8.53981 1.79609 8.62186 1.87814C8.70391 1.96019 8.75 2.07147 8.75 2.1875V2.625H5.25V2.1875ZM10.5 11.375H3.5V3.5H10.5V11.375ZM6.125 5.6875V9.1875C6.125 9.30353 6.07891 9.41481 5.99686 9.49686C5.91481 9.57891 5.80353 9.625 5.6875 9.625C5.57147 9.625 5.46019 9.57891 5.37814 9.49686C5.29609 9.41481 5.25 9.30353 5.25 9.1875V5.6875C5.25 5.57147 5.29609 5.46019 5.37814 5.37814C5.46019 5.29609 5.57147 5.25 5.6875 5.25C5.80353 5.25 5.91481 5.29609 5.99686 5.37814C6.07891 5.46019 6.125 5.57147 6.125 5.6875ZM8.75 5.6875V9.1875C8.75 9.30353 8.70391 9.41481 8.62186 9.49686C8.53981 9.57891 8.42853 9.625 8.3125 9.625C8.19647 9.625 8.08519 9.57891 8.00314 9.49686C7.92109 9.41481 7.875 9.30353 7.875 9.1875V5.6875C7.875 5.57147 7.92109 5.46019 8.00314 5.37814C8.08519 5.29609 8.19647 5.25 8.3125 5.25C8.42853 5.25 8.53981 5.29609 8.62186 5.37814C8.70391 5.46019 8.75 5.57147 8.75 5.6875Z"
                                        fill="#F97066"
                                      />
                                    </svg>
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
