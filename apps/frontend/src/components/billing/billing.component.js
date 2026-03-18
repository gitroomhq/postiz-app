'use client';
import { __awaiter } from "tslib";
import { useCallback } from 'react';
import useSWR from 'swr';
import { LoadingComponent } from "../layout/loading";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { MainBillingComponent } from './main.billing.component';
export const BillingComponent = () => {
    const fetch = useFetch();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        return yield (yield fetch(path)).json();
    }), []);
    const { isLoading: isLoadingTier, data: tiers } = useSWR('/user/subscription/tiers', load);
    const { isLoading: isLoadingSubscription, data: subscription } = useSWR('/user/subscription', load);
    if (isLoadingSubscription || isLoadingTier) {
        return <LoadingComponent />;
    }
    return <MainBillingComponent sub={subscription === null || subscription === void 0 ? void 0 : subscription.subscription}/>;
};
//# sourceMappingURL=billing.component.js.map