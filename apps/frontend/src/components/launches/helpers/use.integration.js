'use client';
import { createContext, useContext } from 'react';
import { newDayjs } from "../../layout/set.timezone";
export const IntegrationContext = createContext({
    integration: undefined,
    value: [],
    date: newDayjs(),
    allIntegrations: [],
});
export const useIntegration = () => useContext(IntegrationContext);
//# sourceMappingURL=use.integration.js.map