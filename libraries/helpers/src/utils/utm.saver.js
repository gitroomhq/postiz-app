'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocalStorage } from '@mantine/hooks';
import { TrackEnum } from "../../../nestjs-libraries/src/user/track.enum";
import { useFireEvents } from "./use.fire.events";
import { useTrack } from "../../../react-shared-libraries/src/helpers/use.track";
const UtmSaver = () => {
    const query = useSearchParams();
    const [value, setValue] = useLocalStorage({ key: 'utm', defaultValue: '' });
    const searchParams = useSearchParams();
    const fireEvents = useFireEvents();
    const track = useTrack();
    useEffect(() => {
        if (searchParams.get('check')) {
            fireEvents('purchase');
            track(TrackEnum.StartTrial);
        }
    }, []);
    useEffect(() => {
        const landingUrl = localStorage.getItem('landingUrl');
        if (landingUrl) {
            return;
        }
        localStorage.setItem('landingUrl', window.location.href);
        localStorage.setItem('referrer', document.referrer);
    }, []);
    useEffect(() => {
        const utm = query.get('utm_source') || query.get('utm') || query.get('ref');
        if (utm && !value) {
            setValue(utm);
        }
    }, [query, value]);
    return <></>;
};
export const useUtmUrl = () => {
    const [value] = useLocalStorage({ key: 'utm', defaultValue: '' });
    return value || '';
};
export default UtmSaver;
//# sourceMappingURL=utm.saver.js.map