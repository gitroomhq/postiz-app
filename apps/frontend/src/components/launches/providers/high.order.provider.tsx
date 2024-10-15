'use client';

import React, {
  FC,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import MDEditor, { commands } from '@uiw/react-md-editor';
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
import { newImage } from '@gitroom/frontend/components/launches/helpers/new.image.component';
import { postSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { UpDownArrow } from '@gitroom/frontend/components/launches/up.down.arrow';
import { arrayMoveImmutable } from 'array-move';
import { linkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { Editor } from '@gitroom/frontend/components/launches/editor';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { AddPostButton } from '@gitroom/frontend/components/launches/add.post.button';
import { GeneralPreviewComponent } from '@gitroom/frontend/components/launches/general.preview.component';
import { capitalize } from 'lodash';

import { ReactComponent as RedBinSvg } from '@gitroom/frontend/assets/red-bin.svg';

// Simple component to change back to settings on after changing tab
export const SetTab: FC<{ changeTab: () => void }> = (props) => {
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
export const EditorWrapper: FC<{ children: ReactNode }> = ({ children }) => {
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

export const withProvider = (
  SettingsComponent: FC<{ values?: any }> | null,
  CustomPreviewComponent?: FC<{ maximumCharacters?: number }>,
  dto?: any,
  checkValidity?: (
    value: Array<Array<{ path: string }>>
  ) => Promise<string | true>,
  maximumCharacters?: number
) => {
  return (props: {
    identifier: string;
    id: string;
    value: Array<{
      content: string;
      id?: string;
      image?: Array<{ path: string; id: string }>;
    }>;
    hideMenu?: boolean;
    show: boolean;
  }) => {
    const existingData = useExistingData();
    const { integration, date } = useIntegration();
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
        image?: Array<{ id: string; path: string }>;
      }>
    >(
      // @ts-ignore
      existingData.integration
        ? existingData.posts.map((p) => ({
            id: p.id,
            content: p.content,
            image: p.image,
          }))
        : [{ content: '' }]
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

    // this is a smart function, it updates the global value without updating the states (too heavy) and set the settings validation
    const form = useValues(
      existingData.settings,
      props.id,
      props.identifier,
      editInPlace ? InPlaceValue : props.value,
      dto,
      checkValidity,
      maximumCharacters
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

    const changeImage = useCallback(
      (index: number) =>
        (newValue: {
          target: { name: string; value?: Array<{ id: string; path: string }> };
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
          ? [{ content: '' }]
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

    // this is a trick to prevent the data from being deleted, yet we don't render the elements
    if (!props.show) {
      return null;
    }

    return (
      <FormProvider {...form}>
        <SetTab changeTab={() => setShowTab(0)} />
        <div className="mt-[15px] w-full flex flex-col flex-1">
          {!props.hideMenu && (
            <div className="flex gap-[4px]">
              <div className="flex-1 flex">
                <Button
                  className="rounded-[4px] flex-1 overflow-hidden whitespace-nowrap"
                  secondary={showTab !== 0}
                  onClick={() => setShowTab(0)}
                >
                  Preview
                </Button>
              </div>
              {!!SettingsComponent && (
                <div className="flex-1 flex">
                  <Button
                    className={clsx(
                      'flex-1 overflow-hidden whitespace-nowrap',
                      showTab === 2 && 'rounded-[4px]'
                    )}
                    secondary={showTab !== 2}
                    onClick={() => setShowTab(2)}
                  >
                    Settings
                  </Button>
                </div>
              )}
              <div className="flex-1 flex">
                <Button
                  className="text-white rounded-[4px] flex-1 !bg-red-700 overflow-hidden whitespace-nowrap"
                  secondary={showTab !== 1}
                  onClick={changeToEditor}
                >
                  {editInPlace
                    ? 'Edit globally'
                    : `Edit only ${integration?.name} (${capitalize(
                        integration?.identifier.replace('-', ' ')
                      )})`}
                </Button>
              </div>
            </div>
          )}
          {editInPlace &&
            createPortal(
              <EditorWrapper>
                <div className="flex flex-col gap-[20px]">
                  {!existingData?.integration && (
                    <div className="bg-red-800">
                      You are now editing only {integration?.name} (
                      {capitalize(integration?.identifier.replace('-', ' '))})
                    </div>
                  )}
                  {InPlaceValue.map((val, index) => (
                    <Fragment key={`edit_inner_${index}`}>
                      <div>
                        <div className="flex gap-[4px]">
                          <div className="flex-1 text-textColor editor">
                            <Editor
                              order={index}
                              height={InPlaceValue.length > 1 ? 200 : 250}
                              value={val.content}
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
                              // @ts-ignore
                              onChange={changeValue(index)}
                            />
                            {(!val.content || val.content.length < 6) && (
                              <div className="my-[5px] text-customColor19 text-[12px] font-[500]">
                                The post should be at least 6 characters long
                              </div>
                            )}
                            <div className="flex">
                              <div className="flex-1">
                                <MultiMediaComponent
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
                </div>
              </EditorWrapper>,
              document.querySelector('#renderEditor')!
            )}
          {(showTab === 0 || showTab === 2) && (
            <div className={clsx('mt-[20px]', showTab !== 2 && 'hidden')}>
              <Component values={editInPlace ? InPlaceValue : props.value} />
            </div>
          )}
          {showTab === 0 && (
            <div className="mt-[20px] flex flex-col items-center">
              <IntegrationContext.Provider
                value={{
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
                      maximumCharacters={maximumCharacters}
                    />
                  ) : (
                    <GeneralPreviewComponent
                      maximumCharacters={maximumCharacters}
                    />
                  )
                ) : (
                  <>No Content Yet</>
                )}
              </IntegrationContext.Provider>
            </div>
          )}
        </div>
      </FormProvider>
    );
  };
};
