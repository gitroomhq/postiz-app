import {FC, useCallback, useMemo} from 'react';
import { Selection, SelectionMethods } from '../click.vote.component';
import styles from './like.style.module.scss';
import clsx from 'clsx';

export const LikeStyle: FC<Selection & SelectionMethods> = (props) => {
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

  const message = useMemo(() => {
    const arr = [];
    if (voted && total.count > 1) {
      arr.push('You and, ');
    }

    if (!voted && total.count > 0) {
      arr.push( `${total.count} people liked this.`);
    }

    if (voted && total.count > 1) {
      arr.push( `${total.count - 1} people liked this.`);
    }

    return arr.join('');
  }, [total, voted]);

  return (
    <div className={clsx(styles.global)}>
      <div
        className={clsx(styles.likeButton, !!voted && styles.liked)}
        onClick={voteUp}
      >
        <span className={styles.likeIcon}>
          <div className={styles.heartAnimation1}></div>
          <div className={styles.heartAnimation2}></div>
        </span>
        Like
      </div>
      <div className={styles.marg}>
        {message}
      </div>
    </div>
  );
};
