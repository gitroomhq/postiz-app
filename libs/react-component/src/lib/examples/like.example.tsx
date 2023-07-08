import { ClickVoteProvider } from '../click.vote.provider';
import { ClickVoteComponent } from '../click.vote.component';
import { Args } from './like.example.stories';
import { FC } from 'react';
import { LikeStyle } from '../types/like.style';

export const LikeExample: FC<Args> = (props) => {
  const { apiUrl, publicKey, voteId, voteTo, userId } = props;
  return (
    <div style={{ width: 200 }}>
      <ClickVoteProvider value={{ apiUrl, publicKey, userId }}>
        <ClickVoteComponent id={voteId} voteTo={voteTo}>
          {(props) => <LikeStyle {...props} />}
        </ClickVoteComponent>
      </ClickVoteProvider>
    </div>
  );
};
