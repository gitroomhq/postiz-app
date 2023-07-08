import { ClickVoteProvider } from '../click.vote.provider';
import { ClickVoteComponent } from '../click.vote.component';
import { UpvoteStyle } from '../types/upvote.style';
import { Args } from './upvote.example.stories';
import { FC } from 'react';

export const UpvoteExample: FC<Args> = (props) => {
  const { apiUrl, publicKey, voteId, voteTo, userId } = props;
  return (
    <ClickVoteProvider value={{ apiUrl, publicKey, userId }}>
      <ClickVoteComponent id={voteId} voteTo={voteTo}>
        {(props) => <UpvoteStyle {...props} />}
      </ClickVoteComponent>
    </ClickVoteProvider>
  );
};
