import { createParamDecorator } from '@nestjs/common';
export const GetOrgFromRequest = createParamDecorator((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.org;
});
//# sourceMappingURL=org.from.request.js.map