'use client';
import { useEffect, useState } from 'react';
export function usePageVisibility(page) {
    if (typeof document === 'undefined') {
        return true;
    }
    const [isVisible, setIsVisible] = useState(!document.hidden);
    useEffect(() => {
        if (page > 1) {
            return;
        }
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };
        const onBlur = () => {
            setIsVisible(false);
        };
        const onFocus = () => {
            setIsVisible(true);
        };
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('blur', onBlur);
            document.removeEventListener('focus', focus);
        };
    }, []);
    return isVisible;
}
//# sourceMappingURL=use.is.visible.js.map