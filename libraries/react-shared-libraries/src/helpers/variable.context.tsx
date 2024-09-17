'use client';

import { createContext, FC, ReactNode, useContext, useEffect } from 'react';

interface VariableContextInterface {
  billingEnabled: boolean;
  isGeneral: boolean;
  frontEndUrl: string;
  plontoKey: string;
  backendUrl: string;
  discordUrl: string;
  uploadDirectory: string;
}
const VariableContext = createContext({
  billingEnabled: false,
  isGeneral: true,
  frontEndUrl: '',
  plontoKey: '',
  backendUrl: '',
  discordUrl: '',
  uploadDirectory: '',
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
