import { __awaiter } from "tslib";
import { TrackEnum } from "../../../nestjs-libraries/src/user/track.enum";
import { useUser } from "../../../../apps/frontend/src/components/layout/user.context";
import { useFetch } from "../../../helpers/src/utils/custom.fetch";
import { useCallback } from 'react';
import { useVariables } from "./variable.context";
export const useTrack = () => {
    const user = useUser();
    const fetch = useFetch();
    const { facebookPixel } = useVariables();
    return useCallback((track, additional) => __awaiter(void 0, void 0, void 0, function* () {
        if (!facebookPixel) {
            return;
        }
        try {
            const { track: uq } = yield (yield fetch(user ? `/user/t` : `/public/t`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign({ tt: track }, (additional
                    ? {
                        additional,
                    }
                    : {}))),
            })).json();
            if (window.fbq) {
                // @ts-ignore
                window.fbq('track', TrackEnum[track], additional, {
                    eventID: uq,
                });
            }
        }
        catch (e) {
            console.log(e);
        }
    }), [user]);
};
//# sourceMappingURL=use.track.js.map