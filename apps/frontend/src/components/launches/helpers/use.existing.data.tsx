import { createContext, FC, ReactNode, useContext } from 'react';
import { Post } from '@prisma/client';
const ExistingDataContext = createContext({
  integration: '',
  group: undefined as undefined | string,
  posts: [] as Post[],
  settings: {} as any,
});
export const ExistingDataContextProvider: FC<{
  children: ReactNode;
  value: any;
}> = ({ children, value }) => {
  return (
    <ExistingDataContext.Provider value={value}>
      {children}
    </ExistingDataContext.Provider>
  );
};
export const useExistingData = () => useContext(ExistingDataContext);
