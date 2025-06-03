'use client';

import EventEmitter from 'events';
import { useCallback, useEffect } from 'react';
const emitter = new EventEmitter();
export const useMoveToIntegration = () => {
  return useCallback(
    ({
      identifier,
      toPreview,
    }: {
      identifier: string;
      toPreview?: boolean;
    }) => {
      emitter.emit('moveToIntegration', {
        identifier,
        toPreview,
      });
    },
    []
  );
};
export const useMoveToIntegrationListener = (
  useEffectParams: any[],
  enabled: boolean,
  callback: ({
    identifier,
    toPreview,
  }: {
    identifier: string;
    toPreview: boolean;
  }) => void
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
