import { createContext } from 'react';
import { UserFromRequest } from '@clickvote/interfaces';

export const UserContext = createContext<undefined | UserFromRequest>(
  undefined
);
