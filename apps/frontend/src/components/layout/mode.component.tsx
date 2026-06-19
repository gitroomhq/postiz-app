'use client';

import { useEffect } from 'react';
import useCookie from 'react-use-cookie';
import EventEmitter from 'events';

export const modeEmitter = new EventEmitter();

const ModeComponent = () => {
  const [, setMode] = useCookie('mode', 'light');

  useEffect(() => {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add('light');
    setMode('light');
    modeEmitter.emit('mode', 'light');
  }, [setMode]);

  return null;
};
export default ModeComponent;
