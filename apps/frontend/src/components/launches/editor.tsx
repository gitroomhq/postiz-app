import { forwardRef } from 'react';
import type { MDEditorProps } from '@uiw/react-md-editor/src/Types';
import { RefMDEditor } from '@uiw/react-md-editor/src/Editor';
import MDEditor from '@uiw/react-md-editor';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { timer } from '@gitroom/helpers/utils/timer';
import dayjs from 'dayjs';

export const Editor = forwardRef<
  RefMDEditor,
  MDEditorProps & { order: number, currentWatching: string, isGlobal: boolean}
>(
  (
    props: MDEditorProps & { order: number, currentWatching: string, isGlobal: boolean },
    ref: React.ForwardedRef<RefMDEditor>
  ) => {
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
        console.log('editPost_' + props.order, content, dayjs().unix());
        props?.onChange?.(content);
      },
    });

    return <MDEditor {...props} ref={ref} />;
  }
);
