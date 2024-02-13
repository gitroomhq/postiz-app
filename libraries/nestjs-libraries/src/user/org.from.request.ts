import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetOrgFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.org;
  }
);
