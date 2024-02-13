import {SetMetadata} from "@nestjs/common";
import {AuthorizationActions, Sections} from "@gitroom/backend/services/auth/permissions/permissions.service";

export const CHECK_POLICIES_KEY = 'check_policy';
export type AbilityPolicy = [AuthorizationActions, Sections];
export const CheckPolicies = (...handlers: AbilityPolicy[]) => SetMetadata(CHECK_POLICIES_KEY, handlers);
