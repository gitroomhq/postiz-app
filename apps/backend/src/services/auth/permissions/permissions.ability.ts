import { SetMetadata } from '@nestjs/common';
import { AuthorizationActions, Sections } from './permission.exception.class';

export const CHECK_POLICIES_KEY = 'check_policy';
export type AbilityPolicy = [AuthorizationActions, Sections];
export const CheckPolicies = (...handlers: AbilityPolicy[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
