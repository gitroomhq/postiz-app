import { __awaiter } from "tslib";
import { createContext, useCallback, useContext, useEffect } from 'react';
import './providers/image-text-slides.provider';
import './providers/veo3.provider';
import { videosList } from "./video.wrapper";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { useLaunchStore } from "../new-launch/store";
const VideoFunctionWrapper = createContext({
    identifier: '',
});
export const useVideoFunction = () => {
    const { identifier } = useContext(VideoFunctionWrapper);
    const fetch = useFetch();
    return useCallback((funcName, params) => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch(`/media/video/function`, {
            method: 'POST',
            body: JSON.stringify({ identifier, functionName: funcName, params }),
            headers: {
                'Content-Type': 'application/json',
            },
        })).json();
    }), [identifier]);
};
export const VideoWrapper = (props) => {
    var _a;
    const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
    useEffect(() => {
        setActivateExitButton(false);
        return () => {
            setActivateExitButton(true);
        };
    }, []);
    const { identifier } = props;
    const Component = (_a = videosList.find((v) => v.identifier === identifier)) === null || _a === void 0 ? void 0 : _a.Component;
    if (!Component) {
        return null;
    }
    return (<VideoFunctionWrapper.Provider value={{ identifier }}>
      <Component />
    </VideoFunctionWrapper.Provider>);
};
//# sourceMappingURL=video.render.component.js.map