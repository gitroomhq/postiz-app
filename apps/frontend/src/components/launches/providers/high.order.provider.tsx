'use client';

import React, {
  FC,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  ClipboardEvent,
  memo,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useHideTopEditor } from '@gitroom/frontend/components/launches/helpers/use.hide.top.editor';
import { useValues } from '@gitroom/frontend/components/launches/helpers/use.values';
import { FormProvider } from 'react-hook-form';
import { useMoveToIntegrationListener } from '@gitroom/frontend/components/launches/helpers/use.move.to.integration';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import {
  IntegrationContext,
  useIntegration,
} from '@gitroom/frontend/components/launches/helpers/use.integration';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { postSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { UpDownArrow } from '@gitroom/frontend/components/launches/up.down.arrow';
import { arrayMoveImmutable } from 'array-move';
import {
  LinkedinCompany,
  linkedinCompany,
} from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { Editor } from '@gitroom/frontend/components/launches/editor';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { AddPostButton } from '@gitroom/frontend/components/launches/add.post.button';
import { GeneralPreviewComponent } from '@gitroom/frontend/components/launches/general.preview.component';
import { capitalize } from 'lodash';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { DropFiles } from '@gitroom/frontend/components/layout/drop.files';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { InternalChannels } from '@gitroom/frontend/components/launches/internal.channels';
import { MergePost } from '@gitroom/frontend/components/launches/merge.post';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSet } from '@gitroom/frontend/components/launches/set.context';
import { SeparatePost } from '@gitroom/frontend/components/launches/separate.post';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

// Simple component to change back to settings on after changing tab
export const SetTab: FC<{
  changeTab: () => void;
}> = (props) => {
  useEffect(() => {
    return () => {
      setTimeout(() => {
        props.changeTab();
      }, 500);
    };
  }, []);
  return null;
};

// This is a simple function that if we edit in place, we hide the editor on top
export const EditorWrapper: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const showHide = useHideTopEditor();
  const [showEditor, setShowEditor] = useState(false);
  useEffect(() => {
    setShowEditor(true);
    showHide.hide();
    return () => {
      showHide.show();
      setShowEditor(false);
    };
  }, []);
  if (!showEditor) {
    return null;
  }
  return children;
};
export const withProvider = function <T extends object>(
  SettingsComponent: FC<{
    values?: any;
  }> | null,
  CustomPreviewComponent?: FC<{
    maximumCharacters?: number;
  }>,
  dto?: any,
  checkValidity?: (
    value: Array<
      Array<{
        path: string;
      }>
    >,
    settings: T
  ) => Promise<string | true>,
  maximumCharacters?: number | ((settings: any) => number)
) {
  return (props: {
    identifier: string;
    id: string;
    value: Array<{
      content: string;
      id?: string;
      image?: Array<{
        path: string;
        id: string;
      }>;
    }>;
    hideMenu?: boolean;
    show: boolean;
    hideEditOnlyThis?: boolean;
  }) => {
    const existingData = useExistingData();
    const t = useT();
    const { allIntegrations, integration, date } = useIntegration();
    const [showLinkedinPopUp, setShowLinkedinPopUp] = useState<any>(false);
    const [uploading, setUploading] = useState(false);
    const [showComponent, setShowComponent] = useState(false);
    const fetch = useFetch();
    useEffect(() => {
      setTimeout(() => {
        setShowComponent(true);
      }, 1);
    }, []);
    useCopilotReadable({
      description:
        integration?.type === 'social'
          ? 'force content always in MD format'
          : 'force content always to be fit to social media',
      value: '',
    });
    const [editInPlace, setEditInPlace] = useState(!!existingData.integration);
    const [InPlaceValue, setInPlaceValue] = useState<
      Array<{
        id?: string;
        content: string;
        image?: Array<{
          id: string;
          path: string;
        }>;
      }>
    >(
      // @ts-ignore
      existingData.integration
        ? existingData.posts.map((p) => ({
            id: p.id,
            content: p.content,
            image: p.image,
          }))
        : [
            {
              content: '',
            },
          ]
    );
    const [showTab, setShowTab] = useState(0);
    const Component = useMemo(() => {
      return SettingsComponent ? SettingsComponent : () => <></>;
    }, [SettingsComponent]);

    // in case there is an error on submit, we change to the settings tab for the specific provider
    useMoveToIntegrationListener(
      [props.id],
      true,
      ({ identifier, toPreview }) => {
        if (identifier === props.id) {
          setShowTab(toPreview ? 1 : 2);
        }
      }
    );

    const set = useSet();

    // this is a smart function, it updates the global value without updating the states (too heavy) and set the settings validation
    const form = useValues(
      set?.set
        ? set?.set?.posts?.find((p) => p?.integration?.id === props?.id)
            ?.settings
        : existingData.settings,
      props.id,
      props.identifier,
      editInPlace ? InPlaceValue : props.value,
      dto,
      checkValidity,
      !maximumCharacters
        ? undefined
        : typeof maximumCharacters === 'number'
        ? maximumCharacters
        : maximumCharacters(JSON.parse(integration?.additionalSettings || '[]'))
    );

    // change editor value
    const changeValue = useCallback(
      (index: number) => (newValue: string) => {
        return setInPlaceValue((prev) => {
          prev[index].content = newValue;
          return [...prev];
        });
      },
      [InPlaceValue]
    );

    const merge = useCallback(() => {
      setInPlaceValue(
        InPlaceValue.reduce(
          (all, current) => {
            all[0].content = all[0].content + current.content + '\n';
            all[0].image = [...all[0].image, ...(current.image || [])];
            return all;
          },
          [
            {
              content: '',
              id: InPlaceValue[0].id,
              image: [] as {
                id: string;
                path: string;
              }[],
            },
          ]
        )
      );
    }, [InPlaceValue]);

    const separatePosts = useCallback(
      (posts: string[]) => {
        setInPlaceValue(
          posts.map((p, i) => ({
            content: p,
            id: InPlaceValue?.[i]?.id || makeId(10),
            image: InPlaceValue?.[i]?.image || [],
          }))
        );
      },
      [InPlaceValue]
    );

    const changeImage = useCallback(
      (index: number) =>
        (newValue: {
          target: {
            name: string;
            value?: Array<{
              id: string;
              path: string;
            }>;
          };
        }) => {
          return setInPlaceValue((prev) => {
            prev[index].image = newValue.target.value;
            return [...prev];
          });
        },
      [InPlaceValue]
    );

    // add another local editor
    const addValue = useCallback(
      (index: number) => () => {
        setInPlaceValue((prev) => {
          return prev.reduce(
            (acc, p, i) => {
              acc.push(p);
              if (i === index) {
                acc.push({
                  content: '',
                });
              }
              return acc;
            },
            [] as Array<{
              content: string;
            }>
          );
        });
      },
      []
    );
    const changePosition = useCallback(
      (index: number) => (type: 'up' | 'down') => {
        if (type === 'up' && index !== 0) {
          setInPlaceValue((prev) => {
            return arrayMoveImmutable(prev, index, index - 1);
          });
        } else if (type === 'down') {
          setInPlaceValue((prev) => {
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
        setInPlaceValue((prev) => {
          prev.splice(index, 1);
          return [...prev];
        });
      },
      [InPlaceValue]
    );

    // This is a function if we want to switch from the global editor to edit in place
    const changeToEditor = useCallback(async () => {
      if (
        !(await deleteDialog(
          !editInPlace
            ? 'Are you sure you want to edit only this?'
            : 'Are you sure you want to revert it back to global editing?',
          'Yes, edit in place!'
        ))
      ) {
        return false;
      }
      setEditInPlace(!editInPlace);
      setInPlaceValue(
        editInPlace
          ? [
              {
                content: '',
              },
            ]
          : props.value.map((p) => ({
              id: p.id,
              content: p.content,
              image: p.image,
            }))
      );
    }, [props.value, editInPlace]);
    useCopilotAction({
      name: editInPlace
        ? 'switchToGlobalEdit'
        : `editInPlace_${integration?.identifier}`,
      description: editInPlace
        ? 'Switch to global editing'
        : `Edit only ${integration?.identifier} this, if you want a different identifier, you have to use setSelectedIntegration first`,
      handler: async () => {
        await changeToEditor();
      },
    });
    const tagPersonOrCompany = useCallback(
      (integration: string, editor: (value: string) => void) => () => {
        setShowLinkedinPopUp(
          <LinkedinCompany
            onSelect={(tag) => {
              editor(tag);
            }}
            id={integration}
            onClose={() => setShowLinkedinPopUp(false)}
          />
        );
      },
      []
    );
    const uppy = useUppyUploader({
      onUploadSuccess: () => {
        /**empty**/
      },
      allowedFileTypes: 'image/*,video/mp4',
    });
    const pasteImages = useCallback(
      (index: number, currentValue: any[], isFile?: boolean) => {
        return async (event: ClipboardEvent<HTMLDivElement> | File[]) => {
          // @ts-ignore
          const clipboardItems = isFile
            ? // @ts-ignore
              event.map((p) => ({
                kind: 'file',
                getAsFile: () => p,
              }))
            : // @ts-ignore
              event.clipboardData?.items; // Ensure clipboardData is available
          if (!clipboardItems) {
            return;
          }
          const files: File[] = [];

          // @ts-ignore
          for (const item of clipboardItems) {
            if (item.kind === 'file') {
              const file = item.getAsFile();
              if (file) {
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');
                if (isImage || isVideo) {
                  files.push(file); // Collect images or videos
                }
              }
            }
          }
          if (files.length === 0) {
            return;
          }
          setUploading(true);
          const lastValues = [...currentValue];
          for (const file of files) {
            uppy.addFile(file);
            const upload = await uppy.upload();
            uppy.clear();
            if (upload?.successful?.length) {
              lastValues.push(upload?.successful[0]?.response?.body?.saved!);
              changeImage(index)({
                target: {
                  name: 'image',
                  value: [...lastValues],
                },
              });
            }
          }
          setUploading(false);
        };
      },
      [changeImage]
    );
    const getInternalPlugs = useCallback(async () => {
      return (
        await fetch(`/integrations/${props.identifier}/internal-plugs`)
      ).json();
    }, [props.identifier]);
    const { data, isLoading } = useSWR(
      `internal-${props.identifier}`,
      getInternalPlugs,
      {
        revalidateOnReconnect: true,
      }
    );

    // this is a trick to prevent the data from being deleted, yet we don't render the elements
    if (!props.show || !showComponent || isLoading) {
      return null;
    }
    return (
      <FormProvider {...form}>
        <SetTab changeTab={() => setShowTab(0)} />
        {showLinkedinPopUp ? showLinkedinPopUp : null}
        <div className="mt-[15px] w-full flex flex-col flex-1">
          {!props.hideMenu && (
            <div className="flex gap-[4px]">
              <div className="flex-1 flex">
                <Button
                  className="rounded-[4px] flex-1 overflow-hidden whitespace-nowrap"
                  secondary={showTab !== 0}
                  onClick={() => setShowTab(0)}
                >
                  {t('preview', 'Preview')}
                </Button>
              </div>
              {(!!SettingsComponent || !!data?.internalPlugs?.length) && (
                <div className="flex-1 flex">
                  <Button
                    className={clsx(
                      'flex-1 overflow-hidden whitespace-nowrap',
                      showTab === 2 && 'rounded-[4px]'
                    )}
                    secondary={showTab !== 2}
                    onClick={() => setShowTab(2)}
                  >
                    {t('settings', 'Settings')}
                  </Button>
                </div>
              )}
              {!existingData.integration && !props.hideEditOnlyThis && (
                <div className="flex-1 flex">
                  <Button
                    className="text-white rounded-[4px] flex-1 !bg-red-700 overflow-hidden whitespace-nowrap"
                    secondary={showTab !== 1}
                    onClick={changeToEditor}
                  >
                    {editInPlace
                      ? 'Edit globally'
                      : `Edit only ${integration?.name.slice(0, 10)}${
                          (integration?.name?.length || 0) > 10 ? '...' : ''
                        } (${capitalize(
                          integration?.identifier.replace('-', ' ')
                        )})`}
                  </Button>
                </div>
              )}
            </div>
          )}
          {editInPlace &&
            createPortal(
              <EditorWrapper>
                {uploading && (
                  <div className="absolute start-0 top-0 w-full h-full bg-black/40 z-[600] flex justify-center items-center">
                    <LoadingComponent width={100} height={100} />
                  </div>
                )}
                <div className="flex flex-col gap-[20px]">
                  {!existingData?.integration && (
                    <div className="bg-red-800 text-white">
                      {t(
                        'you_are_now_editing_only',
                        'You are now editing only'
                      )}
                      {integration?.name} (
                      {capitalize(integration?.identifier.replace('-', ' '))})
                    </div>
                  )}
                  {InPlaceValue.map((val, index) => (
                    <Fragment key={`edit_inner_${index}`}>
                      <div>
                        <div className="flex gap-[4px]">
                          <div className="flex-1 text-textColor editor">
                            {(integration?.identifier === 'linkedin' ||
                              integration?.identifier === 'linkedin-page') && (
                              <Button
                                className="mb-[5px]"
                                onClick={tagPersonOrCompany(
                                  integration.id,
                                  (newValue: string) =>
                                    changeValue(index)(val.content + newValue)
                                )}
                              >
                                {t('tag_a_company', 'Tag a company')}
                              </Button>
                            )}
                            <DropFiles
                              onDrop={pasteImages(index, val.image || [], true)}
                            >
                              <Editor
                                order={index}
                                height={InPlaceValue.length > 1 ? 200 : 250}
                                value={val.content}
                                totalPosts={InPlaceValue.length}
                                commands={[
                                  // ...commands
                                  //   .getCommands()
                                  //   .filter((f) => f.name !== 'image'),
                                  // newImage,
                                  postSelector(date),
                                  ...linkedinCompany(
                                    integration?.identifier!,
                                    integration?.id!
                                  ),
                                ]}
                                preview="edit"
                                onPaste={pasteImages(index, val.image || [])}
                                // @ts-ignore
                                onChange={changeValue(index)}
                              />
                            </DropFiles>
                            {(!val.content || val.content.length < 6) && (
                              <div className="my-[5px] !bg-red-600 text-[12px] font-[500]">
                                {t(
                                  'the_post_should_be_at_least_6_characters_long',
                                  'The post should be at least 6 characters long'
                                )}
                              </div>
                            )}
                            <div className="flex">
                              <div className="flex-1">
                                <MultiMediaComponent
                                  allData={InPlaceValue}
                                  text={val.content}
                                  label="Attachments"
                                  description=""
                                  name="image"
                                  value={val.image}
                                  onChange={changeImage(index)}
                                />
                              </div>
                              <div className="flex bg-customColor20 rounded-br-[8px] text-customColor19">
                                {InPlaceValue.length > 1 && (
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
                                    <div className="text-[12px] font-[500] pe-[10px]">
                                      {t('delete_post', 'Delete Post')}
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
                                InPlaceValue.length !== 0 &&
                                InPlaceValue.length !== index + 1
                              }
                              onChange={changePosition(index)}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <AddPostButton onClick={addValue(index)} num={index} />
                      </div>
                    </Fragment>
                  ))}
                  <div className="flex gap-[4px]">
                    {InPlaceValue.length > 1 && (
                      <div>
                        <MergePost merge={merge} />
                      </div>
                    )}
                    <div>
                      <SeparatePost
                        changeLoading={setUploading}
                        posts={InPlaceValue.map((p) => p.content)}
                        len={
                          typeof maximumCharacters === 'number'
                            ? maximumCharacters
                            : 10000
                        }
                        merge={separatePosts}
                      />
                    </div>
                  </div>
                </div>
              </EditorWrapper>,
              document.querySelector('#renderEditor')!
            )}
          {(showTab === 0 || showTab === 2) && (
            <div className={clsx('mt-[20px]', showTab !== 2 && 'hidden')}>
              <Component values={editInPlace ? InPlaceValue : props.value} />
              {!!data?.internalPlugs?.length && (
                <InternalChannels plugs={data?.internalPlugs} />
              )}
            </div>
          )}
          {showTab === 0 && (
            <div className="mt-[20px] flex flex-col items-center">
              <IntegrationContext.Provider
                value={{
                  allIntegrations,
                  date,
                  value: editInPlace ? InPlaceValue : props.value,
                  integration,
                }}
              >
                {(editInPlace ? InPlaceValue : props.value)
                  .map((p) => p.content)
                  .join('').length ? (
                  CustomPreviewComponent ? (
                    <CustomPreviewComponent
                      maximumCharacters={
                        !maximumCharacters
                          ? undefined
                          : typeof maximumCharacters === 'number'
                          ? maximumCharacters
                          : maximumCharacters(
                              JSON.parse(
                                integration?.additionalSettings || '[]'
                              )
                            )
                      }
                    />
                  ) : (
                    <GeneralPreviewComponent
                      maximumCharacters={
                        !maximumCharacters
                          ? undefined
                          : typeof maximumCharacters === 'number'
                          ? maximumCharacters
                          : maximumCharacters(
                              JSON.parse(
                                integration?.additionalSettings || '[]'
                              )
                            )
                      }
                    />
                  )
                ) : (
                  <>{t('no_content_yet', 'No Content Yet')}</>
                )}
              </IntegrationContext.Provider>
            </div>
          )}
        </div>
      </FormProvider>
    );
  };
};
