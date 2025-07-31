'use client';

import { createContext, FC, ReactNode, useContext, useEffect } from 'react';
interface VariableContextInterface {
  billingEnabled: boolean;
  isGeneral: boolean;
  genericOauth: boolean;
  oauthLogoUrl: string;
  oauthDisplayName: string;
  frontEndUrl: string;
  plontoKey: string;
  storageProvider: 'local' | 'cloudflare';
  backendUrl: string;
  environment: string;
  discordUrl: string;
  uploadDirectory: string;
  facebookPixel: string;
  telegramBotName: string;
  neynarClientId: string;
  isSecured: boolean;
  disableImageCompression: boolean;
  disableXAnalytics: boolean;
  language: string;
  tolt: string;
  transloadit: string[];
  sentryDsn: string;
}
const VariableContext = createContext({
  billingEnabled: false,
  isGeneral: true,
  genericOauth: false,
  oauthLogoUrl: '',
  oauthDisplayName: '',
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
  tolt: '',
  transloadit: [],
  sentryDsn: '',
} as VariableContextInterface);
export const VariableContextComponent: FC<
  VariableContextInterface & {
    children: ReactNode;
  }
> = (props) => {
  const { children, ...otherProps } = props;
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.vars = otherProps;
    }
  }, []);
  return (
    <VariableContext.Provider value={otherProps}>
      {children}
    </VariableContext.Provider>
  );
};
export const useVariables = () => {
  return useContext(VariableContext);
};
export const loadVars = () => {
  // @ts-ignore
  return window.vars as VariableContextInterface;
};
