import {FC, useCallback, useMemo} from 'react';
import { Selection, SelectionMethods } from '../click.vote.component';
import styles from './rate.style.module.scss';

export const RangeStyle: FC<Selection & SelectionMethods> = (props) => {
  const { total, voted, voteValue, vote, startEnd } = props;

  const reset = useCallback(() => {
    vote('range', 0);
  }, []);

  const voteUp = useCallback(
    (newVal: number) => () => {
      if (voted && voteValue === newVal) {
        return reset();
      }

      return vote('range', newVal);
    },
    [voted, voteValue]
  );

  const message = useMemo(() => {
    const arr = [];
    if (voted && total.count > 1) {
      arr.push('You and, ');
    }

    if (!voted && total.count > 0) {
      arr.push( `${total.count} people voted this.`);
    }

    if (voted && total.count > 1) {
      arr.push( `${total.count - 1} people voted this.`);
    }

    return arr.join('');
  }, [total, voted]);
  return (
    <>
      <div className={styles.rate}>
        {[...new Array(startEnd.end)].map((current, index) => (
          <>
            <input
              type="radio"
              name="rate"
              value={startEnd.end - index}
              checked={voted && voteValue === startEnd.end - index}
            />
            <label
              htmlFor="star5"
              title="text"
              onClick={voteUp(startEnd.end - index)}
            >
              ${index + 1} stars
            </label>
          </>
        ))}
      </div>
      <div className={styles.marg}>
        {message}
      </div>
    </>
  );
};
