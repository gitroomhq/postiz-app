import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {AuthController} from "@gitroom/backend/api/routes/auth.controller";
import {AuthService} from "@gitroom/backend/services/auth/auth.service";
import {UsersController} from "@gitroom/backend/api/routes/users.controller";
import {AuthMiddleware} from "@gitroom/backend/services/auth/auth.middleware";

const authenticatedController = [
    UsersController
];
@Module({
    imports: [],
    controllers: [AuthController, ...authenticatedController],
    providers: [AuthService],
})
export class ApiModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(...authenticatedController);
    }
}
