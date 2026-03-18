import { useEffect } from 'react';
export const usePreventWindowUnload = (preventDefault) => {
    useEffect(() => {
        if (!preventDefault)
            return;
        const handleBeforeUnload = (event) => event.preventDefault();
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [preventDefault]);
};
//# sourceMappingURL=use.prevent.window.unload.js.map