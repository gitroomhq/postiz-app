import { Module } from '@nestjs/common';
import {AuthController} from "@gitroom/backend/api/routes/auth.controller";
import {AuthService} from "@gitroom/backend/services/auth/auth.service";
@Module({
    imports: [],
    controllers: [AuthController],
    providers: [AuthService],
})
export class ApiModule {}
