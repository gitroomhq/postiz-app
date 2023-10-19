import { Controller, Get } from '@nestjs/common';
import { UsersService } from '@clickvote/backend/src/packages/users/users.service';
import { UserFromRequest } from '@clickvote/interfaces';

import {
  GetUserFromRequest,
} from '@clickvote/backend/src/helpers/user.from.request';
import { PosthogService } from '@clickvote/nest-libraries';

@Controller('/users')
export class UserController {
  constructor(private _userService: UsersService, private _posthogService:PosthogService) {}

  @Get('/self')
  async getSelf(@GetUserFromRequest() user: UserFromRequest) {
    this._posthogService.trackEvent("user_self", "selfEvent", { login_type: "email", email: user.email })

    return user;
  }
}
