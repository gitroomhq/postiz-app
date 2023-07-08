import type { Meta } from '@storybook/react';
import {RangeExample} from "./range.example";

export interface Args {
  apiUrl: string;
  publicKey: string;
  voteId: string;
  voteTo: string;
  userId: string;
}

const Story: Meta<typeof RangeExample> = {
  component: RangeExample,
  title: 'RangeExample',
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
