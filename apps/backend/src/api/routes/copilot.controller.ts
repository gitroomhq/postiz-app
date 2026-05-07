import {
  Logger,
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
import { GetProfileFromRequest } from '@gitroom/nestjs-libraries/user/profile.from.request';
import { Organization, Profile } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { MastraAgent } from '@ag-ui/mastra';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';
import { Request, Response } from 'express';
import { RequestContext } from '@mastra/core/di';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

export type ChannelsContext = {
  integrations: string;
  organization: string;
  ui: string;
  profileId?: string;
  persona?: string;
};

@Controller('/copilot')
export class CopilotController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _mastraService: MastraService,
    private _profileService: ProfileService
  ) {}
  @Post('/chat')
  chatAgent(@Req() req: Request, @Res() res: Response) {
    if (
      process.env.OPENAI_API_KEY === undefined ||
      process.env.OPENAI_API_KEY === ''
    ) {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return;
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
    @GetOrgFromRequest() organization: Organization,
    @GetProfileFromRequest() profile: Profile | null
  ) {
    if (
      process.env.OPENAI_API_KEY === undefined ||
      process.env.OPENAI_API_KEY === ''
    ) {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return;
    }
    const mastra = await this._mastraService.mastra();
    const requestContext = new RequestContext<ChannelsContext>();
    requestContext.set(
      'integrations',
      req?.body?.variables?.properties?.integrations || []
    );

    requestContext.set('organization', JSON.stringify(organization));
    requestContext.set('ui', 'true');

    // Per-profile credenciais e persona — sem isso o agente usa apenas
    // o default workspace e ignora a persona configurada em
    // Settings > Agente de IA, fazendo o tom de voz, restricoes e CTAs
    // sumirem mesmo quando o usuario preencheu tudo.
    if (profile?.id) {
      requestContext.set('profileId', profile.id);
      try {
        const persona = await this._profileService.getPersonaForAgent(
          profile.id
        );
        if (persona) {
          requestContext.set('persona', JSON.stringify(persona));
        }
      } catch (err) {
        // Best-effort: persona quebrada nao deve bloquear o chat.
        Logger.warn(
          `Falha ao carregar persona do profile ${profile.id}: ${
            (err as Error).message
          }`
        );
      }
    }

    const agents = MastraAgent.getLocalAgents({
      resourceId: organization.id,
      mastra,
      requestContext: requestContext as any,
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

  @Get('/:thread/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getMessagesList(
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<{ uiMessages: Array<{ role: string; content: string }> }> {
    const mastra = await this._mastraService.mastra();
    const memory = await mastra.getAgent('postiz').getMemory();
    try {
      const recalled: any = await memory.recall({
        resourceId: organization.id,
        threadId,
      });
      // Mastra v1.21+ retorna { messages, total, ... }; versoes antigas
      // retornavam { uiMessages, messages, ... }. Normalizamos aqui pra
      // manter o contrato simples com o frontend (uiMessages = lista
      // sequencial de {role, content} pronta pra render).
      const rawMessages: any[] = Array.isArray(recalled?.uiMessages)
        ? recalled.uiMessages
        : Array.isArray(recalled?.messages)
        ? recalled.messages
        : [];
      return {
        uiMessages: rawMessages
          .map((m) => normalizeMessageForUi(m))
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .filter((m) => m.content && m.content.trim().length > 0),
      };
    } catch (err) {
      Logger.warn(
        `Falha ao carregar mensagens do thread ${threadId}: ${
          (err as Error).message
        }`
      );
      return { uiMessages: [] };
    }
  }

  @Get('/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getList(@GetOrgFromRequest() organization: Organization) {
    const mastra = await this._mastraService.mastra();
    const memory = await mastra.getAgent('postiz').getMemory();
    const list = await memory.listThreads({
      filter: { resourceId: organization.id },
      perPage: 100000,
      page: 0,
      orderBy: { field: 'createdAt', direction: 'DESC' },
    });

    return {
      threads: list.threads.map((p) => ({
        id: p.id,
        title: p.title,
      })),
    };
  }
}

/**
 * Mensagens vindas de `memory.recall()` do Mastra podem ter `content`
 * em varios formatos:
 *  - string simples (V1)
 *  - array de parts: `[{ type: 'text', text: '...' }, { type: 'tool-call', ... }]`
 *  - objeto com `parts` aninhado
 *
 * Aqui extraimos somente o texto agregado, descartando partes nao-texto
 * (tool-calls, imagens). O frontend usa `TextMessage({ content, role })`,
 * entao nao precisamos preservar a estrutura de parts.
 */
function normalizeMessageForUi(m: any): { role: string; content: string } {
  const role = String(m?.role ?? '');
  const raw = m?.content;

  if (typeof raw === 'string') {
    return { role, content: raw };
  }

  if (Array.isArray(raw)) {
    const text = raw
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
    return { role, content: text };
  }

  if (raw && typeof raw === 'object' && Array.isArray(raw.parts)) {
    const text = raw.parts
      .map((part: any) =>
        part?.type === 'text' && typeof part.text === 'string'
          ? part.text
          : ''
      )
      .filter(Boolean)
      .join('\n');
    return { role, content: text };
  }

  return { role, content: '' };
}
