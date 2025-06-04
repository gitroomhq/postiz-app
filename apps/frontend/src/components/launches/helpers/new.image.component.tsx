import React from 'react';
import {
  executeCommand,
  ExecuteState,
  ICommand,
  selectWord,
  TextAreaTextApi,
} from '@uiw/react-md-editor';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import { loadVars } from '@gitroom/react/helpers/variable.context';
export const newImage: ICommand = {
  name: 'image',
  keyCommand: 'image',
  shortcuts: 'ctrlcmd+k',
  prefix: '![image](',
  suffix: ')',
  buttonProps: {
    'aria-label': 'Add image (ctrl + k)',
    title: 'Add image (ctrl + k)',
  },
  icon: (
    <svg width="13" height="13" viewBox="0 0 20 20">
      <path
        fill="currentColor"
        d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
      />
    </svg>
  ),
  execute: (state: ExecuteState, api: TextAreaTextApi) => {
    const { uploadDirectory, backendUrl } = loadVars();
    let newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix: state.command.prefix!,
      suffix: state.command.suffix,
    });
    let state1 = api.setSelectionRange(newSelectionRange);
    if (
      state1.selectedText.includes('http') ||
      state1.selectedText.includes('www') ||
      state1.selectedText.includes('(post:')
    ) {
      executeCommand({
        api,
        selectedText: state1.selectedText,
        selection: state.selection,
        prefix: state.command.prefix!,
        suffix: state.command.suffix,
      });
      return;
    }
    newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix: '![',
      suffix: ']()',
    });
    state1 = api.setSelectionRange(newSelectionRange);
    showMediaBox((media) => {
      if (media) {
        if (state1.selectedText.length > 0) {
          executeCommand({
            api,
            selectedText: state1.selectedText,
            selection: state.selection,
            prefix: '![',
            suffix: `](${
              media.path.indexOf('http') === -1
                ? `${backendUrl}/${uploadDirectory}`
                : ``
            }${media.path})`,
          });
          return;
        }
        executeCommand({
          api,
          selectedText: state1.selectedText,
          selection: state.selection,
          prefix: '![image',
          suffix: `](${
            media.path.indexOf('http') === -1
              ? `${backendUrl}/${uploadDirectory}`
              : ``
          }${media.path})`,
        });
      }
    });
  },
};
