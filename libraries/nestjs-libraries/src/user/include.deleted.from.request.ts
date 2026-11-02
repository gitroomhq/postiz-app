import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetIncludeDeletedFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return !!request.includeDeleted;
  }
);
