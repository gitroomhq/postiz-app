import { usePlausible } from 'next-plausible';
import { useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';
import { useVariables } from "../../../react-shared-libraries/src/helpers/variable.context";
import { useUser } from "../../../../apps/frontend/src/components/layout/user.context";
export const useFireEvents = () => {
    const { billingEnabled } = useVariables();
    const plausible = usePlausible();
    const posthog = usePostHog();
    const user = useUser();
    return useCallback((name, props) => {
        if (!billingEnabled) {
            return;
        }
        if (user) {
            posthog.identify(user.id, { email: user.email, name: user.name });
        }
        posthog.capture(name, props);
        plausible(name, { props });
    }, [user]);
};
//# sourceMappingURL=use.fire.events.js.map