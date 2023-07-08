import type { Meta } from '@storybook/react';
import { UpvoteExample } from './upvote.example';

export interface Args {
  apiUrl: string;
  publicKey: string;
  voteId: string;
  voteTo: string;
  userId: string;
}

const Story: Meta<typeof UpvoteExample> = {
  component: UpvoteExample,
  title: 'UpvoteExample',
};
export default Story;

export const Primary = {
  args: {
    apiUrl: 'localhost:3001',
    publicKey: '',
    voteId: 'test',
    voteTo: '',
    userId: ''
  } as Args,
};
