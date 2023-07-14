import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import { useSocketIo } from './socket-io.component';
export interface Selection {
  voted: boolean;
  voteValue: number;
  total: { count: number; avg: number };
  startEnd: {
    start: number;
    end: number;
  };
  poster?: {
    id: string;
    value: number;
  };
}

export interface SelectionMethods {
  vote: (type: 'single' | 'range', value: number) => void;
}

export const ClickVoteComponent: FC<{
  id: string;
  voteTo: string;
  children: (props: Selection & SelectionMethods) => ReactNode;
}> = (props) => {
  const { children, id, voteTo } = props;
  console.log(children);
  const { emit, userId, socket, loaded } = useSocketIo();
  const [data, setData] = useState<undefined | Selection>(undefined);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const loadNewVotes = (newData: any) => {
      setData((currentData) => ({
        ...currentData,
        ...newData,
        ...(newData?.poster?.id === userId
          ? {
              voted: newData.poster.value !== 0,
              voteValue: newData.poster.value,
            }
          : {}),
      }));
    };

    socket?.on(`get-votes-${id}-${voteTo}`, loadNewVotes);
    emit('get-votes', { type: 'single', id: id, voteTo: voteTo });

    return () => {
      socket?.off(`get-votes-${id}-${voteTo}`, loadNewVotes);
    };
  }, [loaded]);

  const vote = useCallback(
    (type: 'single' | 'range', value: number) => {
      const theValue = type === 'range' ? value === 0 ? 0 : 1 : value;
      setData((getData) => ({
        ...getData!,
        total: {
          ...getData!.total!,
          get count() {
            if (type === 'range') {
              if (getData?.voteValue === 0 && theValue > 0) {
                return +(getData?.total.count || 0) + 1;
              }
              else if (+(getData?.voteValue || 0) > 0 && theValue === 0) {
                return +(getData?.total.count || 0) - 1;
              }

              return +(getData?.total.count || 0);
            }
            return (getData?.total.count || 0) - (getData?.voteValue || 0) + (value || 0);
          }
        },
        voted: theValue !== 0,
        voteValue: value,
      }));

      emit('vote', { type, id: id, voteTo: voteTo, value });
    },
    [id, voteTo, emit, data]
  );

  if (!data) {
    return <></>;
  }

  return <>{children({ ...data, vote })}</>;
};
