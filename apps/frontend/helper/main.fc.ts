import { FC } from 'react';
import { UserFromRequest } from '@clickvote/interfaces';

export type MainFC<T = object> = FC<{ user: UserFromRequest } & T>;
