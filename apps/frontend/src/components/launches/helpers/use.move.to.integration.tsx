'use client';

import EventEmitter from 'events';
import { useCallback, useEffect } from 'react';

const emitter = new EventEmitter();
export const useMoveToIntegration = () => {
  return useCallback((identifier: string) => {
    emitter.emit('moveToIntegration', identifier);
  }, []);
};

export const useMoveToIntegrationListener = (
  useEffectParams: any[],
  enabled: boolean,
  callback: (identifier: string) => void
) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    return load();
  }, useEffectParams);

  const load = useCallback(() => {
    emitter.off('moveToIntegration', callback);
    emitter.on('moveToIntegration', callback);
    return () => {
      emitter.off('moveToIntegration', callback);
    };
  }, useEffectParams);
};
