import {
  Logger,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { MastraAgent } from '@ag-ui/mastra';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { Request, Response } from 'express';
import { RuntimeContext } from '@mastra/core/di';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { existsSync, readFileSync, writeFileSync } from 'fs';

export type ChannelsContext = {
  integrations: string;
  organization: string;
  ui: string;
};

function aiNotConfiguredError(res: Response) {
  const isDesktop = process.env.POSTIZ_MODE === 'desktop';
  const msg = isDesktop
    ? 'AI features require OPENAI_API_KEY in ~/Library/Application Support/Postiz/postiz.env. ' +
      'For OpenAI: get a key at platform.openai.com. ' +
      'For local AI (LM Studio, llama.cpp): set OPENAI_API_KEY=local and OPENAI_BASE_URL=http://localhost:1234/v1. ' +
      'For z.ai or other compatible APIs: set OPENAI_API_KEY and OPENAI_BASE_URL to your endpoint. ' +
      'Optionally set OPENAI_CHAT_MODEL to your model name. Restart the app after changes.'
    : 'AI features require OPENAI_API_KEY. For OpenAI: get a key at platform.openai.com. ' +
      'For local AI or compatible APIs (LM Studio, llama.cpp, z.ai): set OPENAI_BASE_URL to your endpoint ' +
      'and OPENAI_API_KEY to any non-empty value. Optionally set OPENAI_CHAT_MODEL to your model name.';
  return res.status(503).json({ error: msg });
}

function makeOpenAIAdapter() {
  // Don't pass a custom OpenAI client — CopilotKit bundles openai v4 internally
  // and reads OPENAI_API_KEY + OPENAI_BASE_URL from env vars automatically.
  return new OpenAIAdapter({
    model: process.env.OPENAI_CHAT_MODEL || undefined,
  });
}

@ApiTags('Copilot')
@Controller('/copilot')
export class CopilotController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _mastraService: MastraService
  ) {}
  @Post('/chat')
  chatAgent(@Req() req: Request, @Res() res: Response) {
    if (!process.env.OPENAI_API_KEY) {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return aiNotConfiguredError(res);
    }

    const copilotRuntimeHandler = copilotRuntimeNodeHttpEndpoint({
      endpoint: '/copilot/chat',
      runtime: new CopilotRuntime(),
      serviceAdapter: makeOpenAIAdapter(),
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
    if (!process.env.OPENAI_API_KEY) {
      Logger.warn('OpenAI API key not set, agent functionality will not work');
      return aiNotConfiguredError(res);
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
      serviceAdapter: makeOpenAIAdapter(),
    });

    return copilotRuntimeHandler.handleRequest(req, res);
  }

  @Get('/status')
  getAiStatus() {
    return {
      configured: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_CHAT_MODEL || undefined,
      baseUrl: process.env.OPENAI_BASE_URL || null,
    };
  }

  @Post('/configure')
  configureAi(
    @Body() body: { apiKey?: string; baseUrl?: string; chatModel?: string },
    @Res({ passthrough: false }) res: Response
  ) {
    // Desktop only — on a shared server, the admin sets env vars directly.
    if (process.env.POSTIZ_MODE !== 'desktop') {
      return res.status(403).json({ error: 'Live configuration is only available in desktop mode. Set environment variables on your server.' });
    }

    // Mutate process.env — takes effect on next makeOpenAIAdapter() call
    if (body.apiKey !== undefined) {
      if (body.apiKey) {
        process.env.OPENAI_API_KEY = body.apiKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
    if (body.baseUrl !== undefined) {
      if (body.baseUrl) {
        process.env.OPENAI_BASE_URL = body.baseUrl;
      } else {
        delete process.env.OPENAI_BASE_URL;
      }
    }
    if (body.chatModel !== undefined) {
      if (body.chatModel) {
        process.env.OPENAI_CHAT_MODEL = body.chatModel;
      } else {
        delete process.env.OPENAI_CHAT_MODEL;
      }
    }

    // Persist to config.toml on desktop (so settings survive restart)
    const configPath = process.env.POSTIZ_CONFIG_PATH;
    if (configPath) {
      try {
        let toml = '';
        if (existsSync(configPath)) {
          toml = readFileSync(configPath, 'utf-8');
        }
        // Remove existing [ai] section and its keys
        toml = toml.replace(/\[ai\]\n(?:[a-z_]+ *= *[^\n]*\n?)*/g, '');
        // Append new [ai] section
        const aiLines: string[] = ['[ai]'];
        if (process.env.OPENAI_API_KEY) {
          aiLines.push(`api_key = "${process.env.OPENAI_API_KEY}"`);
        }
        if (process.env.OPENAI_BASE_URL) {
          aiLines.push(`base_url = "${process.env.OPENAI_BASE_URL}"`);
        }
        if (process.env.OPENAI_CHAT_MODEL) {
          aiLines.push(`chat_model = "${process.env.OPENAI_CHAT_MODEL}"`);
        }
        toml = toml.trimEnd() + '\n\n' + aiLines.join('\n') + '\n';
        writeFileSync(configPath, toml, 'utf-8');
        Logger.log(`AI config persisted to ${configPath}`);
      } catch (err) {
        Logger.warn(`Failed to persist AI config to ${configPath}: ${err}`);
      }
    }

    return res.json({
      configured: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_CHAT_MODEL || undefined,
      baseUrl: process.env.OPENAI_BASE_URL || null,
    });
  }

  @Post('/probe')
  async probeProvider(
    @Body() body: { apiKey: string; baseUrl?: string },
    @Res({ passthrough: false }) res: Response
  ) {
    const base = (body.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await globalThis.fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${body.apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        return res.json({ connected: false, error: `HTTP ${resp.status}` });
      }
      const json = await resp.json();
      const models: string[] = (json.data || [])
        .map((m: any) => m.id as string)
        .filter(Boolean)
        .sort();
      return res.json({ connected: true, models });
    } catch (err: any) {
      return res.json({ connected: false, error: err?.message || 'Connection failed' });
    }
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

  @Get('/:thread/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getMessagesList(
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<any> {
    const mastra = await this._mastraService.mastra();
    const memory = await mastra.getAgent('postiz').getMemory();
    try {
      return await memory.query({
        resourceId: organization.id,
        threadId,
      });
    } catch (err) {
      return { messages: [] };
    }
  }

  @Get('/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getList(@GetOrgFromRequest() organization: Organization) {
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

    return {
      threads: list.threads.map((p) => ({
        id: p.id,
        title: p.title,
      })),
    };
  }
}
