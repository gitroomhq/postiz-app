'use client';

import { createContext, FC, ReactNode, useContext, useState } from 'react';

interface VolatisClientContextValue {
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
}

export const VolatisClientContext = createContext<VolatisClientContextValue>({
  selectedClientId: null,
  setSelectedClientId: () => {},
});

export const VolatisClientProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <VolatisClientContext.Provider
      value={{ selectedClientId, setSelectedClientId }}
    >
      {children}
    </VolatisClientContext.Provider>
  );
};

export const useVolatisClient = () => useContext(VolatisClientContext);
