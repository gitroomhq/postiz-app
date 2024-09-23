import {useCallback} from "react";
import { useVariables } from './variable.context';

export const useMediaDirectory = () => {
    const {backendUrl, uploadDirectory} = useVariables();
    const set = useCallback((path: string) => {
        if (path.indexOf('https') === 0) {
            return path;
        }

        const urlWithoutPort = process.env.NEXT_PUBLIC_BACKEND_URL!.split(':').slice(0, 2).join(':');
        return `${urlWithoutPort}/${path}`;
    }, []);

    return {
        set,
    }
}