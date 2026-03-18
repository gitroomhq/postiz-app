'use client';
import { useEffect } from 'react';
import { useVariables } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { initializeSentryClient } from "../../../../../libraries/react-shared-libraries/src/sentry/initialize.sentry.client";
export const SentryComponent = ({ children }) => {
    const { sentryDsn: dsn, environment } = useVariables();
    useEffect(() => {
        if (!dsn) {
            return;
        }
        initializeSentryClient(environment, dsn);
    }, [dsn]);
    // Always render children - don't block the app
    return <>{children}</>;
};
//# sourceMappingURL=sentry.component.js.map