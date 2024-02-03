import {Controller, Get} from '@nestjs/common';
import {GetUserFromRequest} from "@gitroom/nestjs-libraries/user/user.from.request";
import {User} from "@prisma/client";

@Controller('/user')
export class UsersController {
    @Get('/self')
    async getSelf(
        @GetUserFromRequest() user: User
    ) {
        return user;
    }
}
