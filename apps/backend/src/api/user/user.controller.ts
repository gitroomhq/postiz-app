import { Controller, Get } from '@nestjs/common';
import { UsersService } from '@clickvote/backend/src/packages/users/users.service';
import { UserFromRequest } from '@clickvote/interfaces';

import {
  GetUserFromRequest,
} from '@clickvote/backend/src/helpers/user.from.request';

@Controller('/users')
export class UserController {
  constructor(private _userService: UsersService) {}

  @Get('/self')
  async getSelf(@GetUserFromRequest() user: UserFromRequest) {
    return user;
  }
}
