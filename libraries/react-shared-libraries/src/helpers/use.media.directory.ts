import {useCallback} from "react";

export const useMediaDirectory = () => {
    const set = useCallback((path: string) => {
        if (path.indexOf('https') === 0) {
            return path;
        }
        return `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}${path}`;
    }, []);

    return {
        set,
    }
}