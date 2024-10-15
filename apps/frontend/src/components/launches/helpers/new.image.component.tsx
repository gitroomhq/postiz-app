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

import { ReactComponent as ImageSvg } from '@gitroom/frontend/assets/image.svg';

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
  icon: <ImageSvg />,
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
