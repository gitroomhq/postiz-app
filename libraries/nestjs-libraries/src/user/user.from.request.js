import { createParamDecorator } from '@nestjs/common';
export const GetUserFromRequest = createParamDecorator((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
//# sourceMappingURL=user.from.request.js.map