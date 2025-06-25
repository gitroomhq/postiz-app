'use client';

import { FC, useCallback, useMemo, useRef, useState } from 'react';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Transforms } from 'slate';
import EmojiPicker from 'emoji-picker-react';
import { Theme } from 'emoji-picker-react';
import { BoldText } from '@gitroom/frontend/components/new-launch/bold.text';
import { UText } from '@gitroom/frontend/components/new-launch/u.text';
import { SignatureBox } from '@gitroom/frontend/components/signature';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { AddPostButton } from '@gitroom/frontend/components/new-launch/add.post.button';
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
  } = useLaunchStore(
    useShallow((state) => ({
      internal: state.internal.find((p) => p.integration.id === state.current),
      global: state.global,
      current: state.current,
      addRemoveInternal: state.addRemoveInternal,
      setInternalValueText: state.setInternalValueText,
      setGlobalValueText: state.setGlobalValueText,
      addInternalValue: state.addInternalValue,
      addGlobalValue: state.addGlobalValue,
    }))
  );

  const canEdit = useMemo(() => {
    return current === 'global' || !!internal;
  }, [current, internal]);

  const items = useMemo(() => {
    if (internal) {
      return internal.integrationValue;
    }

    return global;
  }, [current, internal, global]);

  const changeValue = useCallback(
    (index: number) => (value: string) => {
      if (internal) {
        return setInternalValueText(current, index, value);
      }

      return setGlobalValueText(index, value);
    },
    [current, global, internal]
  );

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

  return items.map((g, index) => (
    <div key={g.id} className="relative flex flex-col gap-[10px]">
      {!canEdit && (
        <div
          onClick={() => addRemoveInternal(current)}
          className="select-none cursor-pointer absolute w-full h-full left-0 top-0 bg-red-600/10 z-[100]"
        >
          <div className="absolute left-[50%] top-[50%] bg-red-400 -translate-x-[50%] z-[101] -translate-y-[50%] border-dashed border p-[10px] border-black">
            Edit
          </div>
        </div>
      )}
      <div>
        <Editor
          onChange={changeValue(index)}
          key={index}
          totalPosts={global.length}
          value={g.content}
        />
      </div>

      {canEdit && <AddPostButton num={index} onClick={addValue(index)} />}
    </div>
  ));
};

export const Editor: FC<{
  totalPosts: number;
  value: string;
  onChange: (value: string) => void;
}> = (props) => {
  const user = useUser();
  const [id] = useState(makeId(10));
  const newRef = useRef<any>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const t = useT();

  const addText = useCallback(
    (emoji: string) => {
      setTimeout(() => {
        // @ts-ignore
        Transforms.insertText(newRef?.current?.editor!, emoji);
      }, 10);
    },
    [props.value, id]
  );
  return (
    <>
      <div className="relative bg-customColor2" id={id}>
        <CopilotTextarea
          disableBranding={true}
          ref={newRef}
          className={clsx(
            '!min-h-40 p-2 overflow-x-hidden scrollbar scrollbar-thumb-[#612AD5] bg-customColor2 outline-none',
            props.totalPosts > 1 && '!max-h-80'
          )}
          value={props.value}
          onChange={(e) => {
            props?.onChange?.(e.target.value);
          }}
          // onPaste={props.onPaste}
          placeholder={t('write_your_reply', 'Write your reply...')}
          autosuggestionsConfig={{
            textareaPurpose: `Assist me in writing social media posts.`,
            chatApiConfigs: {},
            disabled: !user?.tier?.ai,
          }}
        />
      </div>
      <div className="flex gap-[5px] justify-end bg-customColor2">
        <SignatureBox editor={newRef?.current?.editor!} />
        <UText editor={newRef?.current?.editor!} currentValue={props.value!} />
        <BoldText
          editor={newRef?.current?.editor!}
          currentValue={props.value!}
        />
        <div
          className="select-none cursor-pointer bg-customColor2 w-[40px] p-[5px] text-center"
          onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
        >
          {t('', '\uD83D\uDE00')}
        </div>
      </div>
      <div className="absolute z-[200] end-0">
        <EmojiPicker
          theme={(localStorage.getItem('mode') as Theme) || Theme.DARK}
          onEmojiClick={(e) => {
            addText(e.emoji);
            setEmojiPickerOpen(false);
          }}
          open={emojiPickerOpen}
        />
      </div>
    </>
  );
};
