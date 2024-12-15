import { Logger, Controller, Get, Post, Req, Res } from '@nestjs/common';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNestEndpoint,
} from '@copilotkit/runtime';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import OpenAI from 'openai';

@Controller('/copilot')
export class CopilotController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _userService: UsersService
  ) {}
  @Post('/chat')
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @GetUserFromRequest() user: User
  ) {
    let openAIAPIKey = '';

    //Check if OPEN AI is enabled for Self tokens.
    if (process.env.ENABLE_OPENAI_SELF === 'true') {
      const userPersonal = await this._userService.getPersonal(user.id);
      openAIAPIKey = userPersonal.openAIAPIKey;
    } else {
      openAIAPIKey = process.env.OPENAI_API_KEY;
    }

    if (openAIAPIKey === undefined || openAIAPIKey === '') {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return;
    }

    const copilotRuntimeHandler = copilotRuntimeNestEndpoint({
      endpoint: '/copilot/chat',
      runtime: new CopilotRuntime(),
      serviceAdapter: new OpenAIAdapter({
        openai: new OpenAI({ apiKey: openAIAPIKey }),
        model:
          // @ts-ignore
          req?.body?.variables?.data?.metadata?.requestType ===
          'TextareaCompletion'
            ? 'gpt-4o-mini'
            : 'gpt-4o-2024-08-06',
      }),
    });

    // @ts-ignore
    return copilotRuntimeHandler(req, res);
  }

  @Get('/credits')
  calculateCredits(@GetOrgFromRequest() organization: Organization) {
    return this._subscriptionService.checkCredits(organization);
  }
}
