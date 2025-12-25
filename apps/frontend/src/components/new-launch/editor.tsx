'use client';

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ClipboardEvent,
  forwardRef,
  useImperativeHandle,
  Fragment,
} from 'react';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import EmojiPicker from 'emoji-picker-react';
import { Theme } from 'emoji-picker-react';
import { BoldText } from '@gitroom/frontend/components/new-launch/bold.text';
import { UText } from '@gitroom/frontend/components/new-launch/u.text';
import { SignatureBox } from '@gitroom/frontend/components/signature';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  SelectedIntegrations,
  useLaunchStore,
} from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { AddPostButton } from '@gitroom/frontend/components/new-launch/add.post.button';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { UpDownArrow } from '@gitroom/frontend/components/launches/up.down.arrow';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useDropzone } from 'react-dropzone';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { Dashboard } from '@uppy/react';
import Link from '@tiptap/extension-link';
import {
  useEditor,
  EditorContent,
  Extension,
  mergeAttributes,
  Node,
} from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Bold from '@tiptap/extension-bold';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Underline from '@tiptap/extension-underline';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { History } from '@tiptap/extension-history';
import { BulletList, ListItem } from '@tiptap/extension-list';
import { Bullets } from '@gitroom/frontend/components/new-launch/bullets.component';
import Heading from '@tiptap/extension-heading';
import { HeadingComponent } from '@gitroom/frontend/components/new-launch/heading.component';
import Mention from '@tiptap/extension-mention';
import { suggestion } from '@gitroom/frontend/components/new-launch/mention.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { AComponent } from '@gitroom/frontend/components/new-launch/a.component';
import { Placeholder } from '@tiptap/extensions';
import { InformationComponent } from '@gitroom/frontend/components/launches/information.component';

const InterceptBoldShortcut = Extension.create({
  name: 'preventBoldWithUnderline',

  addKeyboardShortcuts() {
    return {
      'Mod-b': () => {
        // For example, toggle bold while removing underline
        this?.editor?.commands?.unsetUnderline();
        return this?.editor?.commands?.toggleBold();
      },
    };
  },
});

const InterceptUnderlineShortcut = Extension.create({
  name: 'preventUnderlineWithUnderline',

  addKeyboardShortcuts() {
    return {
      'Mod-u': () => {
        // For example, toggle bold while removing underline
        this?.editor?.commands?.unsetBold();
        return this?.editor?.commands?.toggleUnderline();
      },
    };
  },
});

export const EditorWrapper: FC<{
  totalPosts: number;
  value: string;
}> = () => {
  const {
    setGlobalValueText,
    setInternalValueText,
    addRemoveInternal,
    internal,
    global,
    current,
    addInternalValue,
    addGlobalValue,
    setInternalValueMedia,
    appendInternalValueMedia,
    appendGlobalValueMedia,
    setGlobalValueMedia,
    changeOrderGlobal,
    changeOrderInternal,
    isCreateSet,
    deleteGlobalValue,
    deleteInternalValue,
    setGlobalValue,
    setInternalValue,
    internalFromAll,
    totalChars,
    postComment,
    dummy,
    editor,
    loadedState,
    setLoadedState,
    selectedIntegration,
    chars,
  } = useLaunchStore(
    useShallow((state) => ({
      internal: state.internal.find((p) => p.integration.id === state.current),
      internalFromAll: state.integrations.find((p) => p.id === state.current),
      global: state.global,
      current: state.current,
      addRemoveInternal: state.addRemoveInternal,
      dummy: state.dummy,
      setInternalValueText: state.setInternalValueText,
      setGlobalValueText: state.setGlobalValueText,
      addInternalValue: state.addInternalValue,
      addGlobalValue: state.addGlobalValue,
      setGlobalValueMedia: state.setGlobalValueMedia,
      setInternalValueMedia: state.setInternalValueMedia,
      changeOrderGlobal: state.changeOrderGlobal,
      changeOrderInternal: state.changeOrderInternal,
      isCreateSet: state.isCreateSet,
      deleteGlobalValue: state.deleteGlobalValue,
      deleteInternalValue: state.deleteInternalValue,
      setGlobalValue: state.setGlobalValue,
      setInternalValue: state.setInternalValue,
      totalChars: state.totalChars,
      appendInternalValueMedia: state.appendInternalValueMedia,
      appendGlobalValueMedia: state.appendGlobalValueMedia,
      postComment: state.postComment,
      editor: state.editor,
      loadedState: state.loaded,
      setLoadedState: state.setLoaded,
      selectedIntegration: state.selectedIntegrations,
      chars: state.chars,
    }))
  );

  const existingData = useExistingData();
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    if (loaded && loadedState) {
      return;
    }

    setLoadedState(true);
    setLoaded(true);
  }, [loaded, loadedState]);

  const canEdit = useMemo(() => {
    return current === 'global' || !!internal;
  }, [current, internal]);

  const items = useMemo(() => {
    if (internal) {
      return internal.integrationValue;
    }

    return global;
  }, [internal, global]);

  const setValue = useCallback(
    (value: string[]) => {
      const newValue = value.map((p, index) => {
        return {
          id: makeId(10),
          ...(items?.[index]?.media
            ? { media: items[index].media }
            : { media: [] }),
          content: p,
        };
      });
      if (internal) {
        return setInternalValue(current, newValue);
      }

      return setGlobalValue(newValue);
    },
    [internal, items]
  );

  useCopilotReadable({
    description: 'Current content of posts',
    value: items.map((p) => p.content),
  });

  useCopilotAction({
    name: 'setPosts',
    description: 'a thread of posts',
    parameters: [
      {
        name: 'content',
        type: 'string[]',
        description: 'a thread of posts',
      },
    ],
    handler: async ({ content }) => {
      setValue(content);
    },
  });

  const changeValue = useCallback(
    (index: number) => (value: string) => {
      if (internal) {
        return setInternalValueText(current, index, value);
      }

      return setGlobalValueText(index, value);
    },
    [current, global, internal]
  );

  const changeImages = useCallback(
    (index: number) => (value: any[]) => {
      if (internal) {
        return setInternalValueMedia(current, index, value);
      }

      return setGlobalValueMedia(index, value);
    },
    [current, global, internal]
  );

  const appendImages = useCallback(
    (index: number) => (value: any[]) => {
      if (internal) {
        return appendInternalValueMedia(current, index, value);
      }

      return appendGlobalValueMedia(index, value);
    },
    [current, global, internal]
  );

  const changeOrder = useCallback(
    (index: number) => (direction: 'up' | 'down') => {
      if (internal) {
        changeOrderInternal(current, index, direction);
        return setLoaded(false);
      }

      changeOrderGlobal(index, direction);
      setLoaded(false);
    },
    [changeOrderInternal, changeOrderGlobal, current, global, internal]
  );

  const goBackToGlobal = useCallback(async () => {
    if (
      await deleteDialog(
        'This action is irreversible. Are you sure you want to go back to global mode?',
        'Yes, go back to global mode'
      )
    ) {
      setLoaded(false);
      addRemoveInternal(current);
    }
  }, [addRemoveInternal, current]);

  const addValue = useCallback(
    (index: number) => () => {
      setTimeout(() => {
        // scroll the the bottom
        document.querySelector('#social-content').scrollTo({
          top: document.querySelector('#social-content').scrollHeight,
        });
      }, 20);
      if (internal) {
        return addInternalValue(index, current, [
          {
            content: '',
            id: makeId(10),
            media: [],
          },
        ]);
      }

      return addGlobalValue(index, [
        {
          content: '',
          id: makeId(10),
          media: [],
        },
      ]);
    },
    [current, global, internal]
  );

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

      if (internal) {
        deleteInternalValue(current, index);
        return setLoaded(false);
      }

      deleteGlobalValue(index);
      setLoaded(false);
    },
    [current, global, internal]
  );

  if (!loaded || !loadedState) {
    return null;
  }

  return (
    <div
      className={clsx(
        'relative flex-col gap-[20px] flex-1',
        items.length === 1 && 'flex',
        !canEdit && !isCreateSet && 'bg-newSettings rounded-[12px]'
      )}
    >
      {isCreateSet && current !== 'global' && (
        <>
          <div className="text-center absolute w-full h-full left-0 top-0 items-center justify-center flex z-[101] flex-col gap-[16px]">
            <div>
              <div className="w-[54px] h-[54px] rounded-full absolute z-[101] flex justify-center items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                >
                  <path
                    d="M22.6673 13.3333V10.6667C22.6673 6.98477 19.6825 4 16.0007 4C12.3188 4 9.33398 6.98477 9.33398 10.6667V13.3333M16.0007 19.3333V22M11.734 28H20.2673C22.5075 28 23.6276 28 24.4833 27.564C25.2359 27.1805 25.8479 26.5686 26.2313 25.816C26.6673 24.9603 26.6673 23.8402 26.6673 21.6V19.7333C26.6673 17.4931 26.6673 16.373 26.2313 15.5174C25.8479 14.7647 25.2359 14.1528 24.4833 13.7693C23.6276 13.3333 22.5075 13.3333 20.2673 13.3333H11.734C9.49377 13.3333 8.37367 13.3333 7.51802 13.7693C6.76537 14.1528 6.15345 14.7647 5.76996 15.5174C5.33398 16.373 5.33398 17.4931 5.33398 19.7333V21.6C5.33398 23.8402 5.33398 24.9603 5.76996 25.816C6.15345 26.5686 6.76537 27.1805 7.51802 27.564C8.37367 28 9.49377 28 11.734 28Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="w-[54px] h-[54px] rounded-full bg-newSettings opacity-80" />
            </div>
            <div className="text-[14px] font-[600] text-white">
              You can't edit networks when creating a set
            </div>
          </div>
          <div className="absolute w-full h-full left-0 top-0 bg-newBackdrop opacity-60 z-[100] rounded-[12px]" />
        </>
      )}
      {!canEdit && !isCreateSet && (
        <>
          <div
            onClick={() => {
              setLoaded(false);
              addRemoveInternal(current);
            }}
            className="text-center absolute w-full h-full left-0 top-0 items-center justify-center flex z-[101] flex-col gap-[16px]"
          >
            <div>
              <div className="w-[54px] h-[54px] rounded-full absolute z-[101] flex justify-center items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                >
                  <path
                    d="M22.6673 13.3333V10.6667C22.6673 6.98477 19.6825 4 16.0007 4C12.3188 4 9.33398 6.98477 9.33398 10.6667V13.3333M16.0007 19.3333V22M11.734 28H20.2673C22.5075 28 23.6276 28 24.4833 27.564C25.2359 27.1805 25.8479 26.5686 26.2313 25.816C26.6673 24.9603 26.6673 23.8402 26.6673 21.6V19.7333C26.6673 17.4931 26.6673 16.373 26.2313 15.5174C25.8479 14.7647 25.2359 14.1528 24.4833 13.7693C23.6276 13.3333 22.5075 13.3333 20.2673 13.3333H11.734C9.49377 13.3333 8.37367 13.3333 7.51802 13.7693C6.76537 14.1528 6.15345 14.7647 5.76996 15.5174C5.33398 16.373 5.33398 17.4931 5.33398 19.7333V21.6C5.33398 23.8402 5.33398 24.9603 5.76996 25.816C6.15345 26.5686 6.76537 27.1805 7.51802 27.564C8.37367 28 9.49377 28 11.734 28Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="w-[54px] h-[54px] rounded-full bg-newSettings opacity-80" />
            </div>
            <div className="text-[14px] font-[600] text-white">
              Click this button to exit global editing
              <br />
              and customize the post for this channel
            </div>
            <div>
              <div className="text-white rounded-[8px] h-[44px] px-[20px] bg-[#D82D7E] cursor-pointer flex justify-center items-center">
                Edit content
              </div>
            </div>
          </div>
          <div className="absolute w-full h-full left-0 top-0 bg-newBackdrop opacity-60 z-[100] rounded-[12px]" />
        </>
      )}
      {items.map((g, index) => (
        <div
          key={g.id}
          className={clsx(
            'relative flex flex-col gap-[20px] flex-1 bg-newSettings',
            index === 0 && 'rounded-t-[12px]',
            index === items.length - 1 && 'rounded-b-[12px]',
            !canEdit && !isCreateSet && 'blur-s'
          )}
        >
          <div className="flex gap-[5px] flex-1 w-full">
            <div className="flex-1 flex w-full">
              {index > 0 && (
                <div className="flex justify-center pl-[12px] text-newSep">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="87"
                    viewBox="0 0 18 87"
                    fill="none"
                  >
                    <path
                      d="M0.75 0.75V79.75C0.75 83.0637 3.43629 85.75 6.75 85.75H16.75"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              <Editor
                editorType={editor}
                allValues={items}
                onChange={changeValue(index)}
                key={index}
                num={index}
                totalPosts={global.length}
                value={g.content}
                pictures={g.media}
                setImages={changeImages(index)}
                autoComplete={canEdit}
                validateChars={true}
                identifier={internalFromAll?.identifier || 'global'}
                totalChars={totalChars}
                appendImages={appendImages(index)}
                dummy={dummy}
                selectedIntegration={selectedIntegration}
                chars={chars}
                childButton={
                  <>
                    {canEdit && items.length - 1 === index ? (
                      <div className="flex items-center">
                        <div className="flex-1">
                          <AddPostButton
                            num={index}
                            onClick={addValue(index)}
                            postComment={postComment}
                          />
                        </div>
                        {!!internal && !existingData?.integration && (
                          <div
                            className="mt-[12px] flex gap-[20px] items-center cursor-pointer select-none"
                            onClick={goBackToGlobal}
                          >
                            <div className="flex gap-[6px] items-center">
                              <div className="w-[8px] h-[8px] rounded-full bg-[#FC69FF]" />
                              <div className="text-[14px] font-[600]">
                                Editing a Specific Network
                              </div>
                            </div>
                            <div className="flex gap-[6px] items-center">
                              <div>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                >
                                  <path
                                    d="M1.33398 6.66667C1.33398 6.66667 2.67064 4.84548 3.75654 3.75883C4.84244 2.67218 6.34305 2 8.00065 2C11.3144 2 14.0007 4.68629 14.0007 8C14.0007 11.3137 11.3144 14 8.00065 14C5.26526 14 2.95739 12.1695 2.23516 9.66667M1.33398 6.66667V2.66667M1.33398 6.66667H5.33398"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <div className="text-[13px] font-[600]">
                                Back to global
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                }
              />
            </div>
            <div className="flex flex-col items-center gap-[10px] pe-[12px]">
              <UpDownArrow
                isUp={index !== 0}
                isDown={index !== items.length - 1}
                onChange={changeOrder(index)}
              />
              {items.length > 1 && (
                <svg
                  onClick={deletePost(index)}
                  xmlns="http://www.w3.org/2000/svg"
                  data-tooltip-id="tooltip"
                  data-tooltip-content="Delete Post"
                  className="cursor-pointer"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M7.5 2.5L12.5 2.5M2.5 5L17.5 5M15.8333 5L15.2489 13.7661C15.1612 15.0813 15.1174 15.7389 14.8333 16.2375C14.5833 16.6765 14.206 17.0294 13.7514 17.2497C13.235 17.5 12.5759 17.5 11.2578 17.5H8.74221C7.42409 17.5 6.76503 17.5 6.24861 17.2497C5.79396 17.0294 5.41674 16.6765 5.16665 16.2375C4.88259 15.7389 4.83875 15.0813 4.75107 13.7661L4.16667 5M8.33333 8.75V12.9167M11.6667 8.75L11.6667 12.9167"
                    stroke="#FF3F3F"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const Editor: FC<{
  editorType?: 'normal' | 'markdown' | 'html';
  totalPosts: number;
  value: string;
  num?: number;
  pictures?: any[];
  allValues?: any[];
  onChange: (value: string) => void;
  setImages?: (value: any[]) => void;
  appendImages?: (value: any[]) => void;
  autoComplete?: boolean;
  validateChars?: boolean;
  identifier?: string;
  totalChars?: number;
  selectedIntegration: SelectedIntegrations[];
  dummy: boolean;
  chars: Record<string, number>;
  childButton?: React.ReactNode;
}> = (props) => {
  const {
    editorType = 'normal',
    allValues,
    pictures,
    setImages,
    num,
    validateChars,
    identifier,
    appendImages,
    selectedIntegration,
    dummy,
    chars,
    childButton,
  } = props;
  const user = useUser();
  const [id] = useState(makeId(10));
  const newRef = useRef<any>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const t = useT();
  const editorRef = useRef<undefined | { editor: any }>();

  const uppy = useUppyUploader({
    onUploadSuccess: (result: any) => {
      appendImages(result);
      uppy.clear();
    },
    allowedFileTypes: 'image/*,video/mp4',
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        uppy.addFile(file);
      }
    },
    [uppy]
  );

  const paste = useCallback(
    async (event: ClipboardEvent | File[]) => {
      // @ts-ignore
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) {
        return;
      }

      // @ts-ignore
      for (const item of clipboardItems) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            uppy.addFile(file);
          }
        }
      }
    },
    [uppy]
  );

  const { getRootProps, isDragActive } = useDropzone({ onDrop });

  const valueWithoutHtml = useMemo(() => {
    return stripHtmlValidation('normal', props.value || '', true);
  }, [props.value]);

  const addText = useCallback(
    (emoji: string) => {
      editorRef?.current?.editor?.commands?.insertContent(emoji);
      editorRef?.current?.editor?.commands?.focus();
    },
    [props.value, id]
  );

  const [loadedEditor, setLoadedEditor] = useState(editorType);
  const [showEditor, setShowEditor] = useState(true);
  useEffect(() => {
    if (editorType === loadedEditor) {
      return;
    }
    setLoadedEditor(editorType);
    setShowEditor(false);
  }, [editorType]);

  useEffect(() => {
    if (showEditor) {
      return;
    }
    setTimeout(() => {
      setShowEditor(true);
    }, 20);
  }, [showEditor]);

  if (!showEditor) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[20px] flex-1">
      <div
        className={clsx(
          'relative flex-1 px-[12px] pt-[12px] pb-[12px] flex flex-col',
          num > 0 && '!rounded-bs-[0]'
        )}
        id={id}
      >
        <div className="relative cursor-text flex flex-1 flex-col">
          {/*{validateChars &&*/}
          {/*  props.value.length === 0 &&*/}
          {/*  pictures?.length === 0 && (*/}
          {/*    <div className="px-3 text-sm bg-red-600 !text-white mb-[4px]">*/}
          {/*      Your post should have at least one character or one image.*/}
          {/*    </div>*/}
          {/*  )}*/}
          <div {...getRootProps()} className="flex flex-1 flex-col">
            <div
              className={clsx(
                'absolute left-0 top-0 w-full h-full bg-black/70 z-[300] transition-all items-center justify-center flex text-white text-sm',
                !isDragActive ? 'pointer-events-none opacity-0' : 'opacity-100'
              )}
            >
              Drop your files here to upload
            </div>
            <div className="px-[10px] pt-[10px] bg-newBgColorInner rounded-t-[6px] relative z-[99]">
              <OnlyEditor
                value={props.value}
                editorType={editorType}
                onChange={props.onChange}
                paste={paste}
                ref={editorRef}
              />
            </div>
            <div
              className="bg-newBgColorInner flex-1"
              onClick={() => {
                if (editorRef?.current?.editor?.isFocused) {
                  return;
                }
                editorRef?.current?.editor?.commands?.focus('end');
              }}
            />
            <div className="w-full pointer-events-none">
              <div className="w-full h-[46px] overflow-hidden absolute left-0 bg-newBgColorInner uppyChange">
                <Dashboard
                  height={46}
                  uppy={uppy}
                  id={`prog-${num}`}
                  showProgressDetails={true}
                  hideUploadButton={true}
                  hideRetryButton={true}
                  hidePauseResumeButton={true}
                  hideCancelButton={true}
                  hideProgressAfterFinish={true}
                />
              </div>
            </div>
            <div
              className="w-full h-[46px] bg-newBgColorInner cursor-text"
              onClick={() => {
                if (editorRef?.current?.editor?.isFocused) {
                  return;
                }
                editorRef?.current?.editor?.commands?.focus('end');
              }}
            />
            <div className="flex bg-newBgColorInner rounded-b-[6px] cursor-default">
              {setImages && (
                <MultiMediaComponent
                  allData={allValues}
                  text={valueWithoutHtml}
                  label={t('attachments', 'Attachments')}
                  description=""
                  value={props.pictures}
                  dummy={dummy}
                  name="image"
                  information={
                    <InformationComponent
                      isPicture={pictures?.length > 0}
                      chars={chars}
                      totalChars={valueWithoutHtml.length}
                      totalAllowedChars={props.totalChars}
                    />
                  }
                  toolBar={
                    <div className="flex gap-[5px]">
                      <SignatureBox editor={editorRef?.current?.editor} />
                      <UText
                        editor={editorRef?.current?.editor}
                        currentValue={props.value!}
                      />
                      <BoldText
                        editor={editorRef?.current?.editor}
                        currentValue={props.value!}
                      />
                      {(editorType === 'markdown' || editorType === 'html') &&
                        identifier !== 'telegram' && (
                          <>
                            <AComponent
                              editor={editorRef?.current?.editor}
                              currentValue={props.value!}
                            />
                            <Bullets
                              editor={editorRef?.current?.editor}
                              currentValue={props.value!}
                            />
                            <HeadingComponent
                              editor={editorRef?.current?.editor}
                              currentValue={props.value!}
                            />
                          </>
                        )}
                      <div
                        data-tooltip-id="tooltip"
                        data-tooltip-content="Insert Emoji"
                        className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center"
                        onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M7.97917 14.6663C11.6611 14.6663 14.6458 11.6816 14.6458 7.99967C14.6458 4.31778 11.6611 1.33301 7.97917 1.33301C4.29727 1.33301 1.3125 4.31778 1.3125 7.99967C1.3125 11.6816 4.29727 14.6663 7.97917 14.6663Z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M4.80664 10C5.50664 11.0067 6.67997 11.6667 7.99997 11.6667C9.31997 11.6667 10.4866 11.0067 11.1933 10"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M4.66602 6.16699C5.33268 6.83366 6.41935 6.83366 7.09268 6.16699"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8.90625 6.16699C9.57292 6.83366 10.6596 6.83366 11.3329 6.16699"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="relative">
                        <div
                          className={clsx(
                            'absolute z-[500] -start-[50px]',
                            num === 0 && allValues?.length > 1
                              ? 'top-[35px]'
                              : 'bottom-[35px]'
                          )}
                        >
                          <EmojiPicker
                            height={400}
                            theme={
                              (localStorage.getItem('mode') as Theme) ||
                              Theme.DARK
                            }
                            onEmojiClick={(e) => {
                              addText(e.emoji);
                              setEmojiPickerOpen(false);
                            }}
                            open={emojiPickerOpen}
                          />
                        </div>
                      </div>
                    </div>
                  }
                  onChange={(value) => {
                    setImages(value.target.value);
                  }}
                  onOpen={() => {}}
                  onClose={() => {}}
                />
              )}
            </div>
            <div>{childButton}</div>
          </div>
        </div>
      </div>
      {/*<div className="flex">*/}
      {/*  <div className="bottom-10px end-[25px]">*/}
      {/*    {(props?.totalChars || 0) > 0 ? (*/}
      {/*      <div*/}
      {/*        className={clsx(*/}
      {/*          'text-end text-sm mt-1',*/}
      {/*          valueWithoutHtml.length > props.totalChars && '!text-red-500'*/}
      {/*        )}*/}
      {/*      >*/}
      {/*        {valueWithoutHtml.length}/{props.totalChars}*/}
      {/*      </div>*/}
      {/*    ) : (*/}
      {/*      <div*/}
      {/*        className={clsx(*/}
      {/*          'text-end text-sm mt-1 grid grid-cols-[max-content_max-content] gap-x-[5px]'*/}
      {/*        )}*/}
      {/*      >*/}
      {/*        {selectedIntegration?.map((p) => (*/}
      {/*          <Fragment key={p.integration.id}>*/}
      {/*            <div*/}
      {/*              className={*/}
      {/*                valueWithoutHtml.length > chars?.[p.integration.id] &&*/}
      {/*                '!text-red-500'*/}
      {/*              }*/}
      {/*            >*/}
      {/*              {p.integration.name} ({capitalize(p.integration.identifier)}*/}
      {/*              ):*/}
      {/*            </div>*/}
      {/*            <div*/}
      {/*              className={*/}
      {/*                valueWithoutHtml.length > chars?.[p.integration.id] &&*/}
      {/*                '!text-red-500'*/}
      {/*              }*/}
      {/*            >*/}
      {/*              {valueWithoutHtml.length}/{chars?.[p.integration.id]}*/}
      {/*            </div>*/}
      {/*          </Fragment>*/}
      {/*        ))}*/}
      {/*      </div>*/}
      {/*    )}*/}
      {/*  </div>*/}
      {/*</div>*/}
    </div>
  );
};

export const OnlyEditor = forwardRef<
  any,
  {
    editorType: 'normal' | 'markdown' | 'html';
    value: string;
    onChange: (value: string) => void;
    paste?: (event: ClipboardEvent | File[]) => void;
  }
>(({ editorType, value, onChange, paste }, ref) => {
  const fetch = useFetch();

  const { internal } = useLaunchStore(
    useShallow((state) => ({
      internal: state.internal.find((p) => p.integration.id === state.current),
    }))
  );

  const loadList = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        return [];
      }

      if (!internal?.integration.id) {
        return [];
      }

      try {
        const load = await fetch('/integrations/mentions', {
          method: 'POST',
          body: JSON.stringify({
            name: 'mention',
            id: internal.integration.id,
            data: { query },
          }),
        });

        const result = await load.json();
        return result;
      } catch (error) {
        console.error('Error loading mentions:', error);
        return [];
      }
    },
    [internal, fetch]
  );

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Underline,
      Bold,
      InterceptBoldShortcut,
      InterceptUnderlineShortcut,
      BulletList,
      ListItem,
      Placeholder.configure({
        placeholder: 'Write something …',
        emptyEditorClass: 'is-editor-empty',
      }),
      ...(editorType === 'html' || editorType === 'markdown'
        ? [
            Link.configure({
              openOnClick: false,
              autolink: true,
              defaultProtocol: 'https',
              protocols: ['http', 'https'],
              isAllowedUri: (url, ctx) => {
                try {
                  // prevent transforming plain emails like foo@bar.com into links
                  const trimmed = String(url).trim();
                  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (emailPattern.test(trimmed)) {
                    return false;
                  }

                  // construct URL
                  const parsedUrl = url.includes(':')
                    ? new URL(url)
                    : new URL(`${ctx.defaultProtocol}://${url}`);

                  // use default validation
                  if (!ctx.defaultValidate(parsedUrl.href)) {
                    return false;
                  }

                  // disallowed protocols
                  const disallowedProtocols = ['ftp', 'file', 'mailto'];
                  const protocol = parsedUrl.protocol.replace(':', '');

                  if (disallowedProtocols.includes(protocol)) {
                    return false;
                  }

                  // only allow protocols specified in ctx.protocols
                  const allowedProtocols = ctx.protocols.map((p) =>
                    typeof p === 'string' ? p : p.scheme
                  );

                  if (!allowedProtocols.includes(protocol)) {
                    return false;
                  }

                  // all checks have passed
                  return true;
                } catch {
                  return false;
                }
              },
              shouldAutoLink: (url) => {
                try {
                  // prevent auto-linking of plain emails like foo@bar.com
                  const trimmed = String(url).trim();
                  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (emailPattern.test(trimmed)) {
                    return false;
                  }

                  // construct URL
                  const parsedUrl = url.includes(':')
                    ? new URL(url)
                    : new URL(`https://${url}`);

                  // only auto-link if the domain is not in the disallowed list
                  const disallowedDomains = [
                    'example-no-autolink.com',
                    'another-no-autolink.com',
                  ];
                  const domain = parsedUrl.hostname;

                  return !disallowedDomains.includes(domain);
                } catch {
                  return false;
                }
              },
            }),
          ]
        : []),
      ...(internal?.integration?.id
        ? [
            Mention.configure({
              HTMLAttributes: {
                class: 'mention',
              },
              renderHTML({ options, node }) {
                return [
                  'span',
                  mergeAttributes(options.HTMLAttributes, {
                    'data-mention-id': node.attrs.id || '',
                    'data-mention-label': node.attrs.label || '',
                  }),
                  `@${node.attrs.label}`,
                ];
              },
              suggestion: suggestion(loadList),
            }),
          ]
        : []),
      ...(editorType === 'html' || editorType === 'markdown'
        ? [
            Heading.configure({
              levels: [1, 2, 3],
            }),
          ]
        : []),
      History.configure({
        depth: 100, // default is 100
        newGroupDelay: 100, // default is 500ms
      }),
    ],
    content: value || '',
    shouldRerenderOnTransaction: true,
    immediatelyRender: false,
    // @ts-ignore
    onPaste: paste,
    onUpdate: (innerProps) => {
      onChange?.(innerProps.editor.getHTML());
    },
  });

  useImperativeHandle(ref, () => ({
    editor,
  }));

  return <EditorContent editor={editor} />;
});
