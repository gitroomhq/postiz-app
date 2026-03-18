'use client';
import EventEmitter from 'events';
import { useCallback, useEffect } from 'react';
const emitter = new EventEmitter();
export const useMoveToIntegration = () => {
    return useCallback(({ identifier, toPreview, }) => {
        emitter.emit('moveToIntegration', {
            identifier,
            toPreview,
        });
    }, []);
};
export const useMoveToIntegrationListener = (useEffectParams, enabled, callback) => {
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
//# sourceMappingURL=use.move.to.integration.js.map