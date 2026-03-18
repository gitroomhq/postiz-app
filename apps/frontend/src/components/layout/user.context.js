'use client';
import { createContext, useContext } from 'react';
import { pricing, } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing";
export const UserContext = createContext(undefined);
export const ContextWrapper = ({ user, children }) => {
    const values = user
        ? Object.assign(Object.assign({}, user), { tier: pricing[user.tier] }) : {};
    return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
export const useUser = () => useContext(UserContext);
//# sourceMappingURL=user.context.js.map