'use client';

import EventEmitter from 'events';
import { useEffect, useState } from 'react';
const emitter = new EventEmitter();
export const useExpend = () => {
  const [expend, setExpend] = useState(false);
  useEffect(() => {
    const hide = () => {
      setExpend(false);
    };
    const show = () => {
      setExpend(true);
    };
    emitter.on('hide', hide);
    emitter.on('show', show);
    return () => {
      emitter.off('hide', hide);
      emitter.off('show', show);
    };
  }, []);
  return {
    expend,
    hide: () => {
      emitter.emit('hide');
    },
    show: () => {
      emitter.emit('show');
    },
  };
};
