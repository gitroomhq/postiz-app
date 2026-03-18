'use client';
import { useVariables } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { Analytics as DubAnalyticsIn } from '@dub/analytics/react';
import { getCookie } from 'react-use-cookie';
export const DubAnalytics = () => {
    const { dub } = useVariables();
    if (!dub)
        return null;
    return (<DubAnalyticsIn domainsConfig={{
            refer: 'postiz.pro',
        }}/>);
};
export const useDubClickId = () => {
    var _a;
    const { dub } = useVariables();
    if (!dub)
        return undefined;
    const dubCookie = getCookie('dub_partner_data', '{}');
    return ((_a = JSON.parse(dubCookie)) === null || _a === void 0 ? void 0 : _a.clickId) || undefined;
};
//# sourceMappingURL=dubAnalytics.js.map