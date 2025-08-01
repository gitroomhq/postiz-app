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
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { AddPostButton } from '@gitroom/frontend/components/new-launch/add.post.button';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { UpDownArrow } from '@gitroom/frontend/components/launches/up.down.arrow';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { LinkedinCompanyPop } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { useDropzone } from 'react-dropzone';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { Dashboard } from '@uppy/react';
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
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useDebouncedCallback } from 'use-debounce';

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
}> = (props) => {
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
    <div className="relative flex flex-col gap-[20px]">
      {items.map((g, index) => (
        <div key={g.id} className="relative flex flex-col gap-[20px]">
          {!canEdit && !isCreateSet && (
            <div
              onClick={() => {
                if (index !== 0) {
                  return;
                }

                setLoaded(false);
                addRemoveInternal(current);
              }}
              className="select-none cursor-pointer absolute w-full h-full left-0 top-0 bg-red-600/10 z-[100]"
            >
              {index === 0 && (
                <div className="absolute left-[50%] top-[50%] bg-red-400 -translate-x-[50%] z-[101] -translate-y-[50%] border-dashed border p-[10px] border-black">
                  Edit
                </div>
              )}
            </div>
          )}
          <div className="flex gap-[5px]">
            <div className="flex-1">
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
              />
            </div>
            <div className="flex flex-col items-center gap-[10px]">
              <UpDownArrow
                isUp={index !== 0}
                isDown={index !== items.length - 1}
                onChange={changeOrder(index)}
              />
              {index === 0 &&
                current !== 'global' &&
                canEdit &&
                !existingData.integration && (
                  <svg
                    onClick={goBackToGlobal}
                    className="cursor-pointer"
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Go back to global mode"
                    width="20"
                    height="20"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 3C13.4288 3 10.9154 3.76244 8.77759 5.1909C6.63975 6.61935 4.97351 8.64968 3.98957 11.0251C3.00563 13.4006 2.74819 16.0144 3.2498 18.5362C3.75141 21.0579 4.98953 23.3743 6.80762 25.1924C8.6257 27.0105 10.9421 28.2486 13.4638 28.7502C15.9856 29.2518 18.5995 28.9944 20.9749 28.0104C23.3503 27.0265 25.3807 25.3603 26.8091 23.2224C28.2376 21.0846 29 18.5712 29 16C28.9964 12.5533 27.6256 9.24882 25.1884 6.81163C22.7512 4.37445 19.4467 3.00364 16 3ZM12.7038 21H19.2963C18.625 23.2925 17.5 25.3587 16 26.9862C14.5 25.3587 13.375 23.2925 12.7038 21ZM12.25 19C11.9183 17.0138 11.9183 14.9862 12.25 13H19.75C20.0817 14.9862 20.0817 17.0138 19.75 19H12.25ZM5.00001 16C4.99914 14.9855 5.13923 13.9759 5.41626 13H10.2238C9.92542 14.9889 9.92542 17.0111 10.2238 19H5.41626C5.13923 18.0241 4.99914 17.0145 5.00001 16ZM19.2963 11H12.7038C13.375 8.7075 14.5 6.64125 16 5.01375C17.5 6.64125 18.625 8.7075 19.2963 11ZM21.7763 13H26.5838C27.1388 14.9615 27.1388 17.0385 26.5838 19H21.7763C22.0746 17.0111 22.0746 14.9889 21.7763 13ZM25.7963 11H21.3675C20.8572 8.99189 20.0001 7.0883 18.835 5.375C20.3236 5.77503 21.7119 6.48215 22.9108 7.45091C24.1097 8.41967 25.0926 9.62861 25.7963 11ZM13.165 5.375C11.9999 7.0883 11.1428 8.99189 10.6325 11H6.20376C6.90741 9.62861 7.89029 8.41967 9.08918 7.45091C10.2881 6.48215 11.6764 5.77503 13.165 5.375ZM6.20376 21H10.6325C11.1428 23.0081 11.9999 24.9117 13.165 26.625C11.6764 26.225 10.2881 25.5178 9.08918 24.5491C7.89029 23.5803 6.90741 22.3714 6.20376 21ZM18.835 26.625C20.0001 24.9117 20.8572 23.0081 21.3675 21H25.7963C25.0926 22.3714 24.1097 23.5803 22.9108 24.5491C21.7119 25.5178 20.3236 26.225 18.835 26.625Z"
                      fill="#ef4444"
                    />
                  </svg>
                )}
              {items.length > 1 && (
                <svg
                  onClick={deletePost(index)}
                  className="cursor-pointer"
                  data-tooltip-id="tooltip"
                  data-tooltip-content="Delete Post"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 14 14"
                  fill="currentColor"
                >
                  <path
                    d="M11.8125 2.625H9.625V2.1875C9.625 1.8394 9.48672 1.50556 9.24058 1.25942C8.99444 1.01328 8.6606 0.875 8.3125 0.875H5.6875C5.3394 0.875 5.00556 1.01328 4.75942 1.25942C4.51328 1.50556 4.375 1.8394 4.375 2.1875V2.625H2.1875C2.07147 2.625 1.96019 2.67109 1.87814 2.75314C1.79609 2.83519 1.75 2.94647 1.75 3.0625C1.75 3.17853 1.79609 3.28981 1.87814 3.37186C1.96019 3.45391 2.07147 3.5 2.1875 3.5H2.625V11.375C2.625 11.6071 2.71719 11.8296 2.88128 11.9937C3.04538 12.1578 3.26794 12.25 3.5 12.25H10.5C10.7321 12.25 10.9546 12.1578 11.1187 11.9937C11.2828 11.8296 11.375 11.6071 11.375 11.375V3.5H11.8125C11.9285 3.5 12.0398 3.45391 12.1219 3.37186C12.2039 3.28981 12.25 3.17853 12.25 3.0625C12.25 2.94647 12.2039 2.83519 12.1219 2.75314C12.0398 2.67109 11.9285 2.625 11.8125 2.625ZM5.25 2.1875C5.25 2.07147 5.29609 1.96019 5.37814 1.87814C5.46019 1.79609 5.57147 1.75 5.6875 1.75H8.3125C8.42853 1.75 8.53981 1.79609 8.62186 1.87814C8.70391 1.96019 8.75 2.07147 8.75 2.1875V2.625H5.25V2.1875ZM10.5 11.375H3.5V3.5H10.5V11.375ZM6.125 5.6875V9.1875C6.125 9.30353 6.07891 9.41481 5.99686 9.49686C5.91481 9.57891 5.80353 9.625 5.6875 9.625C5.57147 9.625 5.46019 9.57891 5.37814 9.49686C5.29609 9.41481 5.25 9.30353 5.25 9.1875V5.6875C5.25 5.57147 5.29609 5.46019 5.37814 5.37814C5.46019 5.29609 5.57147 5.25 5.6875 5.25C5.80353 5.25 5.91481 5.29609 5.99686 5.37814C6.07891 5.46019 6.125 5.57147 6.125 5.6875ZM8.75 5.6875V9.1875C8.75 9.30353 8.70391 9.41481 8.62186 9.49686C8.53981 9.57891 8.42853 9.625 8.3125 9.625C8.19647 9.625 8.08519 9.57891 8.00314 9.49686C7.92109 9.41481 7.875 9.30353 7.875 9.1875V5.6875C7.875 5.57147 7.92109 5.46019 8.00314 5.37814C8.08519 5.29609 8.19647 5.25 8.3125 5.25C8.42853 5.25 8.53981 5.29609 8.62186 5.37814C8.70391 5.46019 8.75 5.57147 8.75 5.6875Z"
                    fill="#ef4444"
                  />
                </svg>
              )}
            </div>
          </div>

          {canEdit ? (
            <AddPostButton
              num={index}
              onClick={addValue(index)}
              postComment={postComment}
            />
          ) : (
            <div className="h-[25px]" />
          )}
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
  dummy: boolean;
}> = (props) => {
  const {
    editorType = 'normal',
    allValues,
    pictures,
    setImages,
    num,
    autoComplete,
    validateChars,
    identifier,
    appendImages,
    dummy,
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

  return (
    <div>
      <div className="relative bg-bigStrip" id={id}>
        <div className="flex gap-[5px] bg-newBgLineColor border-b border-t border-customColor3 justify-center items-center p-[5px]">
          <SignatureBox editor={editorRef?.current?.editor} />
          <UText
            editor={editorRef?.current?.editor}
            currentValue={props.value!}
          />
          <BoldText
            editor={editorRef?.current?.editor}
            currentValue={props.value!}
          />
          {(editorType === 'markdown' || editorType === 'html') && identifier !== 'telegram' && (
            <>
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
            className="select-none cursor-pointer w-[40px] p-[5px] text-center"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
          >
            {'\uD83D\uDE00'}
          </div>
          <div className="relative">
            <div className="absolute z-[200] top-[35px] -start-[50px]">
              <EmojiPicker
                theme={(localStorage.getItem('mode') as Theme) || Theme.DARK}
                onEmojiClick={(e) => {
                  addText(e.emoji);
                  setEmojiPickerOpen(false);
                }}
                open={emojiPickerOpen}
              />
            </div>
          </div>
        </div>
        <div className="relative cursor-text">
          {validateChars &&
            props.value.length === 0 &&
            pictures?.length === 0 && (
              <div className="px-3 text-sm bg-red-600 !text-white mb-[4px]">
                Your post should have at least one character or one image.
              </div>
            )}
          <div {...getRootProps()}>
            <div
              className={clsx(
                'absolute left-0 top-0 w-full h-full bg-black/70 z-[300] transition-all items-center justify-center flex text-white text-sm',
                !isDragActive ? 'pointer-events-none opacity-0' : 'opacity-100'
              )}
            >
              Drop your files here to upload
            </div>
            <div className="px-[10px] pt-[10px]">
              <OnlyEditor
                value={props.value}
                editorType={editorType}
                onChange={props.onChange}
                paste={paste}
                ref={editorRef}
              />
            </div>

            <div
              className="w-full h-[46px] overflow-hidden absolute left-0"
              onClick={() => {
                if (editorRef?.current?.editor?.isFocused) {
                  return;
                }
                editorRef?.current?.editor?.commands?.focus('end');
              }}
            >
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
            <div className="w-full h-[46px] pointer-events-none" />
            <div
              className="flex bg-newBgLineColor"
              onClick={() => {
                if (editorRef?.current?.editor?.isFocused) {
                  return;
                }
                editorRef?.current?.editor?.commands?.focus('end');
              }}
            >
              {setImages && (
                <MultiMediaComponent
                  allData={allValues}
                  text={valueWithoutHtml}
                  label={t('attachments', 'Attachments')}
                  description=""
                  value={props.pictures}
                  dummy={dummy}
                  name="image"
                  onChange={(value) => {
                    setImages(value.target.value);
                  }}
                  onOpen={() => {}}
                  onClose={() => {}}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-10px end-[25px]">
        {(props?.totalChars || 0) > 0 && (
          <div
            className={clsx(
              'text-end text-sm mt-1',
              valueWithoutHtml.length > props.totalChars && '!text-red-500'
            )}
          >
            {valueWithoutHtml.length}/{props.totalChars}
          </div>
        )}
      </div>
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
      Heading.configure({
        levels: [1, 2, 3],
      }),
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
