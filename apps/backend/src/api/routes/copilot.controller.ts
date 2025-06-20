import { Logger, Controller, Get, Post, Req, Res } from '@nestjs/common';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNestEndpoint,
} from '@copilotkit/runtime';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

@Controller('/copilot')
export class CopilotController {
  constructor(private _subscriptionService: SubscriptionService) {}
  @Post('/chat')
  chat(@Req() req: Request, @Res() res: Response) {
    if (
      !process.env.OPENAI_API_KEY && !process.env.OPENAI_BASE_URL // if using offical OpenAI API, abort if no key
    ) {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return;
    }

    const copilotRuntimeHandler = copilotRuntimeNestEndpoint({
      endpoint: '/copilot/chat',
      runtime: new CopilotRuntime(),
      serviceAdapter: new OpenAIAdapter({
        model:
          // @ts-ignore
          req?.body?.variables?.data?.metadata?.requestType ===
          'TextareaCompletion'
            ? (process.env.OPENAI_TEXT_MODEL_MINI || 'gpt-4o-mini')
            : (process.env.OPENAI_TEXT_MODEL || 'gpt-4.1'),
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
