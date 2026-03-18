'use client';
import { __rest } from "tslib";
import { createContext, useContext, useEffect } from 'react';
const VariableContext = createContext({
    stripeClient: '',
    billingEnabled: false,
    isGeneral: true,
    genericOauth: false,
    oauthLogoUrl: '',
    oauthDisplayName: '',
    mcpUrl: '',
    frontEndUrl: '',
    storageProvider: 'local',
    plontoKey: '',
    backendUrl: '',
    discordUrl: '',
    uploadDirectory: '',
    isSecured: false,
    telegramBotName: '',
    facebookPixel: '',
    neynarClientId: '',
    disableImageCompression: false,
    disableXAnalytics: false,
    language: '',
    dub: false,
    transloadit: [],
    sentryDsn: '',
    extensionId: '',
});
export const VariableContextComponent = (props) => {
    const { children } = props, otherProps = __rest(props, ["children"]);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.vars = otherProps;
        }
    }, []);
    return (<VariableContext.Provider value={otherProps}>
      {children}
    </VariableContext.Provider>);
};
export const useVariables = () => {
    return useContext(VariableContext);
};
export const loadVars = () => {
    // @ts-ignore
    return window.vars;
};
//# sourceMappingURL=variable.context.js.map