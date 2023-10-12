<script context="module" lang="ts">
  import { SvelteComponent, onMount } from 'svelte';
  import {io, Socket} from 'socket.io-client';
  import * as socketComponent from "./socket-io.component.svelte"
  
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

  let { emit, userId, socket, loaded } = socketComponent.useSocketIo();
  let data: undefined | Selection = undefined;
  export let children: SvelteComponent;
  export let id: string;
  export let voteTo: string;

  onMount(async () => {

    if (!loaded) {
      return;
    }

    socket ?? io('').on(`get-votes-${id}-${voteTo}`, loadNewVotes);
    emit('get-votes', { type: 'single', id, voteTo });
  });

  const loadNewVotes = (newData: any) => {
    data = {
      ...data,
      ...newData,
      ...(newData.poster.id === userId
        ? {
            voted: newData.poster.value !== 0,
            voteValue: newData.poster.value,
          }
        : {}),
    };
  };

  const vote = (type: 'single' | 'range', value: number) => {
    const theValue = type === 'range' ? (value === 0 ? 0 : 1) : value;
    data = {
      ...data,
      total: {
        ...(data?.total || { count: 0, avg: 0 }),
        count:
          type === 'range'
            ? data?.voteValue === 0 && theValue > 0
              ? data.total.count + 1
              : (data?.voteValue ?? 0 > 0) && theValue === 0
              ? data?.total.count ?? 0 - 1
              : data?.total.count ?? 0
            : data?.total.count ?? 0 - (data?.voteValue || 0) + (value || 0),
      },
      voted: theValue !== 0,
      voteValue: value,
      startEnd: data?.startEnd || {start: 0, end: 0}
    };

    emit('vote', { type, id, voteTo, value });
  };
</script>

{#if data}
  <slot {data} on:vote={vote} />
{/if}
