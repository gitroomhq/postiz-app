import { defineSignal } from '@temporalio/workflow';

export type SendEmail = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};
export const sendEmailSignal = defineSignal<[SendEmail]>('sendEmail');
