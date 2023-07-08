import { FC, useCallback } from 'react';
import { Selection, SelectionMethods } from '../click.vote.component';
import styles from './upvote.style.module.scss';
import clsx from 'clsx';
import arrow from './images/arrow.svg';

const ArrowSvg: FC<any> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      {...props}
    >
      <path data-border={true} fill="white" d="M4 14h4v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h4a1.001 1.001 0 0 0 .781-1.625l-8-10c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 0 0 4 14z"/>
      <path d="M12.781 2.375c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 004 14h4v7a1 1 0 001 1h6a1 1 0 001-1v-7h4a1.001 1.001 0 00.781-1.625l-8-10zM15 12h-1v8h-4v-8H6.081L12 4.601 17.919 12H15z" />
    </svg>
  );
};
export const UpvoteStyle: FC<Selection & SelectionMethods> = (props) => {
  const { total, voted, voteValue, vote } = props;

  const reset = useCallback(() => {
    vote('single', 0);
  }, []);

  const voteUp = useCallback(() => {
    if (voted && voteValue > 0) {
      return reset();
    }

    return vote('single', 1);
  }, [voted, voteValue]);

  const voteDown = useCallback(() => {
    if (voted && voteValue < 0) {
      return reset();
    }

    return vote('single', -1);
  }, [voted, voteValue]);

  return (
    <div style={{ width: 20 }} className={clsx(styles.flex, styles.flexCol)}>
      <ArrowSvg
        className={clsx(voted && voteValue > 0 && styles.selected)}
        onClick={voteUp}
      />
      <div className={clsx(styles.flex, styles.flexCol, styles.center, voted && styles.selectedText)}>
        {total.count}
      </div>
      <ArrowSvg
        className={clsx(
          styles.rotate,
          voted && voteValue < 0 && styles.selected
        )}
        onClick={voteDown}
      />
    </div>
  );
};
