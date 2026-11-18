import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetOAuthUserIdFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.oauthUserId as string | undefined;
  }
);
