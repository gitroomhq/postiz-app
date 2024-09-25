import {useCallback} from "react";
import { useVariables } from './variable.context';

export const useMediaDirectory = () => {
    const {backendUrl, uploadDirectory} = useVariables();
    const set = useCallback((path: string) => {
        if (path.indexOf('https') === 0) {
            return path;
        }
        return `${backendUrl}/${uploadDirectory}${path}`;
    }, []);

    return {
        set,
    }
}