import { createContext, FC, useContext, PropsWithChildren, useCallback, useState } from 'react';
import { UserFromRequest } from '@clickvote/interfaces';

type UserContextType = {
  user: UserFromRequest;
  updateUserOrgName: (name: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(
  undefined
);

type Props = PropsWithChildren<{
  value: UserFromRequest;
}>

export const UserContextProvider: FC<Props> = ({value, children}) => {
  const [user, setUser] = useState(value);

  const updateUserOrgName = useCallback((orgName: string) => {
    setUser(user => ({
      ...user,
      currentOrg: {...user.currentOrg, name: orgName},
      org: user.org.map(org => org.id === user.currentOrg.id ? {...org, name: orgName} : org)
    }));
  }, []);

  return (
    <UserContext.Provider value={{ user, updateUserOrgName }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUserContext = () => {
  const userContext = useContext(UserContext);
  if (userContext === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return userContext;
}
