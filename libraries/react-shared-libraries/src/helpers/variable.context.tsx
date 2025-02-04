'use client';

import { createContext, FC, ReactNode, useContext, useEffect } from 'react';

interface VariableContextInterface {
  billingEnabled: boolean;
  isGeneral: boolean;
  frontEndUrl: string;
  plontoKey: string;
  storageProvider: 'local' | 'cloudflare',
  backendUrl: string;
  discordUrl: string;
  uploadDirectory: string;
  facebookPixel: string;
  telegramBotName: string;
  neynarClientId: string;
  isSecured: boolean;
  tolt: string;
}
const VariableContext = createContext({
  billingEnabled: false,
  isGeneral: true,
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
  tolt: '',
} as VariableContextInterface);

export const VariableContextComponent: FC<
  VariableContextInterface & { children: ReactNode }
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
}

export const loadVars = () => {
  // @ts-ignore
  return window.vars as VariableContextInterface;
}
