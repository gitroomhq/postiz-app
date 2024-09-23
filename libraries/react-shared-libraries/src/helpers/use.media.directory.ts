import {useCallback} from "react";

export const useMediaDirectory = () => {
    const set = useCallback((path: string) => {
        if (path.indexOf('https') === 0) {
            return path;
        }
       return `http://localhost/${path}`;
    }, []);

    return {
        set,
    }
}