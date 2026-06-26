'use client';

import { ReactNode } from 'react';
import {
  ModalManager,
} from '@gitroom/frontend/components/layout/new-modal';
export const MantineWrapper = (props: { children: ReactNode }) => {
  return (
    <ModalManager>
      {props.children}
    </ModalManager>
  );
};
