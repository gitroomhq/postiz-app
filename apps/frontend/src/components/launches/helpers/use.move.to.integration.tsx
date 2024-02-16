'use client';

import EventEmitter from 'events';
import {useCallback, useEffect} from 'react';

const emitter = new EventEmitter();
export const useMoveToIntegration = () => {
  return useCallback((identifier: string) => {
    emitter.emit('moveToIntegration', identifier);
  }, []);
};

export const useMoveToIntegrationListener = (
  enabled: boolean,
  callback: (identifier: string) => void
) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    return load();
  }, []);

  const load = useCallback(() => {
    emitter.on('moveToIntegration', callback);
    return () => {
      emitter.off('moveToIntegration', callback);
    };
  }, []);
};
