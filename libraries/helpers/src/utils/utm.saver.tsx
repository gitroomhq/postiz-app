import {FC, useCallback, useEffect} from "react";
import {useSearchParams} from "next/navigation";

const UtmSaver: FC = () => {
    const query = useSearchParams();
    useEffect(() => {
        const landingUrl = localStorage.getItem('landingUrl');
        if (landingUrl) {
            return ;
        }

        localStorage.setItem('landingUrl', window.location.href);
        localStorage.setItem('referrer', document.referrer);
    }, []);

    useEffect(() => {
        const utm = query.get('utm_source') || query.get('utm');
        const utmMedium = query.get('utm_medium');
        const utmCampaign = query.get('utm_campaign');

        if (utm) {
            localStorage.setItem('utm', utm);
        }
        if (utmMedium) {
            localStorage.setItem('utm_medium', utmMedium);
        }
        if (utmCampaign) {
            localStorage.setItem('utm_campaign', utmCampaign);
        }
    }, [query]);

    return <></>;
}

export const useUtmSaver = () => {
    return useCallback(() => {
        return {
            utm: localStorage.getItem('utm'),
            utmMedium: localStorage.getItem('utm_medium'),
            utmCampaign: localStorage.getItem('utm_campaign'),
            landingUrl: localStorage.getItem('landingUrl'),
            referrer: localStorage.getItem('referrer'),
        }
    }, []);
}

export default UtmSaver;