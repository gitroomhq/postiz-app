import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  Param,
} from '@nestjs/common';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { MastraAgent } from '@ag-ui/mastra';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { Request, Response } from 'express';
import { RuntimeContext } from '@mastra/core/di';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

export type ChannelsContext = {
  integrations: string;
  organization: string;
  ui: string;
};

@Controller('/copilot')
export class CopilotController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _mastraService: MastraService
  ) {}
  @Post('/chat')
  chatAgent(@Req() req: Request, @Res() res: Response) {
    if (
      process.env.OPENAI_API_KEY === undefined ||
      process.env.OPENAI_API_KEY === '' ||
      process.env.OPENAI_API_KEY?.trim() === ''
    ) {
      return res.status(503).json({
        error: 'Chat is not configured',
        code: 'CHAT_DISABLED',
      });
    }

    const copilotRuntimeHandler = copilotRuntimeNodeHttpEndpoint({
      endpoint: '/copilot/chat',
      runtime: new CopilotRuntime(),
      serviceAdapter: new OpenAIAdapter({
        model: 'gpt-4.1',
      }),
    });

    return copilotRuntimeHandler(req, res);
  }

  @Post('/agent')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async agent(
    @Req() req: Request,
    @Res() res: Response,
    @GetOrgFromRequest() organization: Organization
  ) {
    if (
      process.env.OPENAI_API_KEY === undefined ||
      process.env.OPENAI_API_KEY === '' ||
      process.env.OPENAI_API_KEY?.trim() === ''
    ) {
      return res.status(503).json({
        error: 'Chat is not configured',
        code: 'CHAT_DISABLED',
      });
    }
    const mastra = await this._mastraService.mastra();
    const runtimeContext = new RuntimeContext<ChannelsContext>();
    runtimeContext.set(
      'integrations',
      req?.body?.variables?.properties?.integrations || []
    );

    runtimeContext.set('organization', JSON.stringify(organization));
    runtimeContext.set('ui', 'true');

    const agents = MastraAgent.getLocalAgents({
      resourceId: organization.id,
      mastra,
      // @ts-ignore
      runtimeContext,
    });

    const runtime = new CopilotRuntime({
      agents,
    });

    const copilotRuntimeHandler = copilotRuntimeNextJSAppRouterEndpoint({
      endpoint: '/copilot/agent',
      runtime,
      // properties: req.body.variables.properties,
      serviceAdapter: new OpenAIAdapter({
        model: 'gpt-4.1',
      }),
    });

    return copilotRuntimeHandler.handleRequest(req, res);
  }

  @Get('/credits')
  calculateCredits(
    @GetOrgFromRequest() organization: Organization,
    @Query('type') type: 'ai_images' | 'ai_videos'
  ) {
    return this._subscriptionService.checkCredits(
      organization,
      type || 'ai_images'
    );
  }

  private _isChatEnabled(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return !!key && key.trim() !== '';
  }

  @Get('/:thread/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getMessagesList(
    @Res() res: Response,
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<any> {
    if (!this._isChatEnabled()) {
      return res.status(503).json({
        error: 'Chat is not configured',
        code: 'CHAT_DISABLED',
      });
    }
    const mastra = await this._mastraService.mastra();
    const memory = await mastra.getAgent('postiz').getMemory();
    try {
      const data = await memory.query({
        resourceId: organization.id,
        threadId,
      });
      return res.json(data);
    } catch (err) {
      return res.json({ messages: [] });
    }
  }

  @Get('/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getList(
    @Res() res: Response,
    @GetOrgFromRequest() organization: Organization
  ) {
    if (!this._isChatEnabled()) {
      return res.status(503).json({
        error: 'Chat is not configured',
        code: 'CHAT_DISABLED',
      });
    }
    const mastra = await this._mastraService.mastra();
    // @ts-ignore
    const memory = await mastra.getAgent('postiz').getMemory();
    const list = await memory.getThreadsByResourceIdPaginated({
      resourceId: organization.id,
      perPage: 100000,
      page: 0,
      orderBy: 'createdAt',
      sortDirection: 'DESC',
    });

    return res.json({
      threads: list.threads.map((p) => ({
        id: p.id,
        title: p.title,
      })),
    });
  }
}
