import { useCallback } from 'react';
export const useMediaDirectory = () => {
    const set = useCallback((path) => {
        return path;
    }, []);
    return {
        set,
    };
};
//# sourceMappingURL=use.media.directory.js.map