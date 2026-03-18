import { createParamDecorator } from '@nestjs/common';
export const UserAgent = createParamDecorator((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['user-agent'];
});
//# sourceMappingURL=user.agent.js.map