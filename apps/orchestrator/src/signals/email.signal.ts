import { defineSignal } from '@temporalio/workflow';

export type Email = {
  message: string;
  title?: string;
  type: 'success' | 'fail' | 'info';
};

export const emailSignal = defineSignal<[Email[]]>('email');
