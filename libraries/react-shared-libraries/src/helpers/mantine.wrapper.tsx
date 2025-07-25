'use client';

import { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import i18next from '@gitroom/react/translation/i18next';
export const MantineWrapper = (props: { children: ReactNode }) => {
  const dir = i18next.dir();

  return (
    // @ts-ignore
    <MantineProvider>
      <ModalsProvider
        modalProps={{
          dir,
          classNames: {
            modal: 'bg-primary text-white',
            close: 'bg-black hover:bg-black cursor-pointer',
          },
        }}
      >
        {props.children}
      </ModalsProvider>
    </MantineProvider>
  );
};
