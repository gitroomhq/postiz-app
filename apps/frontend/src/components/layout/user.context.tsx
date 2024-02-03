"use client";

import {createContext, FC, ReactNode, useContext} from "react";
import {User} from "@prisma/client";

export const UserContext = createContext<undefined|User>(undefined);

export const ContextWrapper: FC<{user: User, children: ReactNode}> = ({user, children}) => {
    return (
        <UserContext.Provider value={user}>
            {children}
        </UserContext.Provider>
    )
}

export const useUser = () => useContext(UserContext);