import { Logger, Controller, Get, Post, Req, Res, Query } from '@nestjs/common';
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
      process.env.OPENAI_API_KEY === undefined ||
      process.env.OPENAI_API_KEY === ''
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
            ? 'gpt-4o-mini'
            : 'gpt-4.1',
      }),
    });

    // @ts-ignore
    return copilotRuntimeHandler(req, res);
  }

  @Get('/credits')
  calculateCredits(
    @GetOrgFromRequest() organization: Organization,
    @Query('type') type: 'ai_images' | 'ai_videos',
  ) {
    return this._subscriptionService.checkCredits(organization, type || 'ai_images');
  }
}
