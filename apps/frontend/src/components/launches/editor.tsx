import { forwardRef } from 'react';
import type { MDEditorProps } from '@uiw/react-md-editor/src/Types';
import { RefMDEditor } from '@uiw/react-md-editor/src/Editor';
import MDEditor from '@uiw/react-md-editor';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

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
    useCopilotReadable({
      description: 'Content of the post number ' + (props.order + 1),
      value: props.content,
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

    return (
      <div className="relative bg-customColor2">
        {user?.tier?.ai ? (
          <CopilotTextarea
            disableBranding={true}
            className={clsx(
              '!min-h-40 !max-h-80 p-2 overflow-hidden bg-customColor2 outline-none'
            )}
            value={props.value}
            onChange={(e) => props?.onChange?.(e.target.value)}
            placeholder="Write your reply..."
            autosuggestionsConfig={{
              textareaPurpose: `Assist me in writing social media posts.`,
              chatApiConfigs: {},
            }}
          />
        ) : (
          <MDEditor {...props} ref={ref} />
        )}
      </div>
    );
  }
);
