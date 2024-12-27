import { forwardRef, useCallback, useRef, useState } from 'react';
import type { MDEditorProps } from '@uiw/react-md-editor/src/Types';
import { RefMDEditor } from '@uiw/react-md-editor/src/Editor';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Transforms } from 'slate';
import EmojiPicker from 'emoji-picker-react';
import { Theme } from 'emoji-picker-react';
import { BoldText } from '@gitroom/frontend/components/launches/bold.text';
import { UText } from '@gitroom/frontend/components/launches/u.text';

export const Editor = forwardRef<
  RefMDEditor,
  MDEditorProps & { order: number; currentWatching: string; isGlobal: boolean }
>(
  (
    props: MDEditorProps & {
      order: number;
      currentWatching: string;
      isGlobal: boolean;
    },
    ref: React.ForwardedRef<RefMDEditor>
  ) => {
    const user = useUser();
    const [id] = useState(makeId(10));
    const newRef = useRef<any>(null);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

    useCopilotReadable({
      description: 'Content of the post number ' + (props.order + 1),
      value: props.value,
    });

    useCopilotAction({
      name: 'editPost_' + props.order,
      description: `Edit the content of post number ${props.order + 1}`,
      parameters: [
        {
          name: 'content',
          type: 'string',
        },
      ],
      handler: async ({ content }) => {
        props?.onChange?.(content);
      },
    });

    const addText = useCallback(
      (emoji: string) => {
        // @ts-ignore
        Transforms.insertText(newRef?.current?.editor!, emoji);
      },
      [props.value, id]
    );

    return (
      <>
        <div className="flex gap-[5px] justify-end -mt-[30px]">
          <UText
            editor={newRef?.current?.editor!}
            currentValue={props.value!}
          />
          <BoldText
            editor={newRef?.current?.editor!}
            currentValue={props.value!}
          />
          <div
            className="select-none cursor-pointer bg-customColor2 w-[40px] p-[5px] text-center rounded-tl-lg rounded-tr-lg"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
          >
            😀
          </div>
        </div>
        <div className="absolute z-[200] right-0">
          <EmojiPicker
            theme={(localStorage.getItem('mode') as Theme) || Theme.DARK}
            onEmojiClick={(e) => {
              addText(e.emoji);
              setEmojiPickerOpen(false);
            }}
            open={emojiPickerOpen}
          />
        </div>
        <div className="relative bg-customColor2" id={id}>
          <CopilotTextarea
            disableBranding={true}
            ref={newRef}
            className={clsx(
              '!min-h-40 !max-h-80 p-2 overflow-x-hidden scrollbar scrollbar-thumb-[#612AD5] bg-customColor2 outline-none'
            )}
            value={props.value}
            onChange={(e) => {
              props?.onChange?.(e.target.value);
            }}
            onPaste={props.onPaste}
            placeholder="Write your reply..."
            autosuggestionsConfig={{
              textareaPurpose: `Assist me in writing social media posts.`,
              chatApiConfigs: {},
              disabled: !user?.tier?.ai,
            }}
          />
        </div>
      </>
    );
  }
);
