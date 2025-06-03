'use client';

import EventEmitter from 'events';
import { useEffect, useState } from 'react';
const emitter = new EventEmitter();
export const useHideTopEditor = () => {
  const [hideTopEditor, setHideTopEditor] = useState(false);
  useEffect(() => {
    const hide = () => {
      setHideTopEditor(true);
    };
    const show = () => {
      setHideTopEditor(false);
    };
    emitter.on('hide', hide);
    emitter.on('show', show);
    return () => {
      emitter.off('hide', hide);
      emitter.off('show', show);
    };
  }, []);
  return {
    hideTopEditor,
    hide: () => {
      emitter.emit('hide');
    },
    show: () => {
      emitter.emit('show');
    },
  };
};
