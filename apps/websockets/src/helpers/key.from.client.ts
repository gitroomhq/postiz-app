import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const KeyFromClient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToWs().getClient();
    return request.key;
  }
);

export const IdFromClient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToWs().getClient();
    return request.keyId;
  }
);
