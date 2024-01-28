import {Body, Controller, Post} from '@nestjs/common';
import {CreateOrgUserDto} from "@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto";
import {LoginUserDto} from "@gitroom/nestjs-libraries/dtos/auth/login.user.dto";
import {AuthService} from "@gitroom/backend/services/auth/auth.service";

@Controller()
export class AuthController {
  constructor(
      private _authService: AuthService
  ) {
  }
  @Post('/register')
  register(
      @Body() body: CreateOrgUserDto
  ) {
    return this._authService.routeAuth(body.provider, body);
  }

  @Post('/login')
  login(
      @Body() body: LoginUserDto
  ) {
    return this._authService.routeAuth(body.provider, body);
  }
}
