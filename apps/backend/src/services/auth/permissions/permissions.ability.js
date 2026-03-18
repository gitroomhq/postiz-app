import { SetMetadata } from '@nestjs/common';
export const CHECK_POLICIES_KEY = 'check_policy';
export const CheckPolicies = (...handlers) => SetMetadata(CHECK_POLICIES_KEY, handlers);
//# sourceMappingURL=permissions.ability.js.map