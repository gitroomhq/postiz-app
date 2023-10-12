<script lang="ts" context="module">
  import { onMount } from 'svelte';
  import { socketStore, counterStore, tokenStore } from './globalState';
  import { io, Socket } from 'socket.io-client';
  import {
    ClickVoteProviderType,
    ClickVoteProvider,
  } from './click.vote.provider';
  import dayjs from 'dayjs';

  export function useSocketIo() {
    let socketContext: ClickVoteProviderType = {
      apiUrl: undefined,
      publicKey: null,
      userId: '',
    };

    let counter: null | number = 0; // Initialize counter
    let token: null | { token: string; expiration: number } = null;
    let socket: Socket | null;
    let loaded = false;

    const login = (sock?: Socket) => {
      return new Promise((res) => {
        const newSocket = sock || socket;
        if (!newSocket) {
          return;
        }

        newSocket.on('login', (data: { token: string; expiration: number }) => {
          res(data);
          loaded = true;
          tokenStore.set(data);
        });
        newSocket.emit('login', { apiKey: socketContext.publicKey });
      });
    };

    onMount(() => {
      ClickVoteProvider.subscribe((val) => (socketContext = val));
      socketStore.subscribe((val) => (socket = val));
      counterStore.subscribe((val) => (counter = val)); // Update counter
      tokenStore.subscribe((val) => (token = val));

      if (!socket) {
        const ioConnect = io(socketContext.apiUrl || '', {
          autoConnect: true,
          auth: {
            token: `${socketContext.publicKey}:${socketContext.userId}`,
          },
        });

        ioConnect.on('connect', () => {
          login(ioConnect);
        });

        socketStore.set(ioConnect);
      } else {
        loaded = true;
      }

      counterStore.update((val) => (val ?? 0) + 1);

      return () => {
        counterStore.update((val) => (val ?? 0) - 1);
        if (counter === 0) {
          socket?.disconnect();
          socketStore.set(null);
        }
      };
    });

    const emit = async (event: string, data: any) => {
      if (
        !token ||
        dayjs.unix(token.expiration).subtract(5, 'minutes').isBefore(dayjs())
      ) {
        const newToken = await login();
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
    };

    return {
      socket,
      loaded: loaded,
      userId: socketContext.userId,
      emit: emit,
    };
  };
</script>
