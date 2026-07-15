import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DbuIntegrationController } from './dbu.integration.controller';
import { DbuAuthMiddleware } from './dbu.auth.middleware';

// DBU System <-> Mapped Out Social Studio integration.
// The HMAC middleware authenticates every route on the controller.
@Module({
  controllers: [DbuIntegrationController],
})
export class DbuIntegrationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DbuAuthMiddleware).forRoutes(DbuIntegrationController);
  }
}
