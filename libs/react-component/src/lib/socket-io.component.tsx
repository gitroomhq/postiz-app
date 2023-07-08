import { createGlobalState } from 'react-hooks-global-state';
import { io, Socket } from 'socket.io-client';
import { useCallback, useContext, useEffect, useState } from 'react';
import { clickVoteContext } from './click.vote.provider';
import dayjs from 'dayjs';

const { useGlobalState } = createGlobalState<{
  counter: null | number;
  socket: null | Socket;
  token: null | { token: string; expiration: number };
}>({
  socket: null,
  counter: null,
  token: null,
});

// We don't want to add a react context, it adds complexity, we can just use a global state
// Also a context will render the entire wrapper everytime.
export const useSocketIo = () => {
  const [socket, setSocket] = useGlobalState('socket');
  const [counter, setCounter] = useGlobalState('counter');
  const [token, setToken] = useGlobalState('token');

  const socketContext = useContext(clickVoteContext);
  const [loaded, setLoaded] = useState(false);

  const login = useCallback(
    (sock?: Socket) => {
      return new Promise((res) => {
        const newSocket = sock || socket;
        if (!newSocket) {
          return;
        }

        newSocket.on('login', (data) => {
          res(data);
          setLoaded(true);
          setToken(data);
        });
        newSocket.emit('login', { apiKey: socketContext.publicKey });
      });
    },
    [socket]
  );

  useEffect(() => {
    if (!socket) {
      const ioConnect = io(socketContext.apiUrl!, {
        autoConnect: true,
        auth: {
          token: `${socketContext.publicKey}:${socketContext.userId}`,
        },
      });

      ioConnect.on('connect', () => {
        login(ioConnect);
      });

      setSocket(ioConnect);
    } else {
      setLoaded(true);
    }

    setCounter((counter || 0) + 1);
    return () => {
      const newCounter = (counter || 0) - 1;
      setCounter(newCounter);
      if (newCounter === 0) {
        socket?.disconnect();
        setSocket(null);
      }
    };
  }, []);

  const emit = useCallback(
    async (event: string, data: any) => {
      if (
        !token ||
        dayjs.unix(token.expiration).subtract(5, 'minutes').isBefore(dayjs())
      ) {
        const newToken: any = await login();
        socket?.emit(event, {
          ...data,
          token: newToken,
          userId: socketContext.userId,
        });
      } else {
        socket?.emit(event, {
          ...data,
          token: token.token,
          userId: socketContext.userId,
        });
      }
    },
    [token, socket]
  );

  return {
    userId: socketContext.userId,
    loaded,
    socket,
    emit,
  };
};
