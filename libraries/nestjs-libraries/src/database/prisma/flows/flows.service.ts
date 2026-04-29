import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { FlowsRepository } from '@gitroom/nestjs-libraries/database/prisma/flows/flows.repository';
import {
  FlowStatus,
  FlowNodeType,
  FlowExecutionStatus,
  PendingPostback,
  PendingPostbackStatus,
} from '@prisma/client';
import {
  CreateFlowDto,
  UpdateFlowDto,
  SaveCanvasDto,
  QuickCreateFlowDto,
} from '@gitroom/nestjs-libraries/dtos/flows/flow.dto';
import { TemporalService } from 'nestjs-temporal-core';
import {
  organizationId as orgSearchAttr,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { TypedSearchAttributes } from '@temporalio/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import type { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';
import { CredentialService } from '@gitroom/nestjs-libraries/database/prisma/credentials/credential.service';
import * as crypto from 'crypto';

// Janela de 24h da Meta para trocar mensagens apos interacao do usuario.
// Usamos 23h para dar margem de seguranca e nao tentar DM expirado.
const POSTBACK_EXPIRATION_MS = 23 * 60 * 60 * 1000;

@Injectable()
export class FlowsService {
  private readonly _logger = new Logger(FlowsService.name);

  constructor(
    private _flowsRepository: FlowsRepository,
    private _temporalService: TemporalService,
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager,
    private _credentialService: CredentialService
  ) {}

  getFlows(orgId: string, profileId?: string) {
    return this._flowsRepository.getFlows(orgId, profileId);
  }

  getFlow(orgId: string, id: string, profileId?: string) {
    return this._flowsRepository.getFlow(orgId, id, profileId);
  }

  getFlowById(id: string) {
    return this._flowsRepository.getFlowById(id);
  }

  async createFlow(orgId: string, body: CreateFlowDto, profileId?: string) {
    const check = await this.checkIntegrationWebhook(orgId, body.integrationId);
    if (!check.ok) {
      throw new BadRequestException(check.error);
    }
    return this._flowsRepository.createFlow(orgId, body, profileId);
  }

  async checkIntegrationWebhook(
    orgId: string,
    integrationId: string
  ): Promise<{ ok: boolean; error?: string; subscribed?: boolean }> {
    const integration = await this._integrationService.getIntegrationById(
      orgId,
      integrationId
    );
    if (!integration) {
      return { ok: false, error: 'Integracao nao encontrada' };
    }
    if (integration.providerIdentifier !== 'instagram') {
      return {
        ok: false,
        error: 'Apenas contas do Instagram suportam automacoes no momento',
      };
    }

    const provider = this._integrationManager.getSocialIntegration(
      'instagram'
    ) as unknown as InstagramProvider;
    if (!provider) {
      return { ok: false, error: 'Provider Instagram indisponivel' };
    }

    // Resolve {appId, appSecret} respecting per-workspace credentials. Mirrors
    // the precedence used in CredentialService.configureInstagramWebhook and
    // the IG providers (so the check queries the same Meta app the OAuth flow
    // talks to). Order: workspace IG-specific -> workspace generic FB ->
    // INSTAGRAM_APP_* env -> FACEBOOK_APP_* env.
    const creds = await this._credentialService.getRaw(
      integration.organizationId,
      'facebook',
      integration.profileId ?? undefined
    );
    const appId =
      creds?.instagramAppId ||
      creds?.clientId ||
      process.env.INSTAGRAM_APP_ID ||
      process.env.FACEBOOK_APP_ID;
    const appSecret =
      creds?.instagramAppSecret ||
      creds?.clientSecret ||
      process.env.INSTAGRAM_APP_SECRET ||
      process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return {
        ok: false,
        error:
          'Credenciais do app Meta nao configuradas. Abra Configuracoes > Credenciais > Facebook ' +
          'e preencha clientId/clientSecret (ou instagramAppId/instagramAppSecret). ' +
          'Sem isso a checagem de webhook nao consegue identificar qual app consultar.',
      };
    }

    try {
      const subs = await this.fetchAppSubscriptions(appId, appSecret);
      const igSub = subs.find((s) => s.object === 'instagram');
      if (!igSub) {
        const presentSummary = subs.length
          ? subs
              .map((s) => {
                const fields = (s.fields || []).map((f) => f.name).join(',') || '-';
                return `${s.object} (active=${s.active}, fields=${fields})`;
              })
              .join('; ')
          : 'nenhuma';
        return {
          ok: false,
          error:
            `App Meta ${appId}: nenhuma subscription com object='instagram' encontrada. ` +
            `Subscriptions presentes: ${presentSummary}. ` +
            'Configure em Meta Developer Portal > seu app > Casos de uso > instagram_manage_comments > ' +
            'Configurar webhooks, colando a Callback URL e o Verify Token mostrados na tela de Automacoes. ' +
            'Se o webhook foi cadastrado em outro app, aponte as credenciais em Configuracoes > Credenciais ' +
            'para o app onde a subscription esta registrada.',
        };
      }
      if (!igSub.active) {
        return {
          ok: false,
          error:
            `App Meta ${appId}: subscription instagram esta inativa ` +
            `(callback_url=${igSub.callback_url || '-'}). ` +
            'Ative-a em Casos de uso > instagram_manage_comments.',
        };
      }
      const fieldNames = (igSub.fields || []).map((f) => f.name);
      const missing: string[] = [];
      if (!fieldNames.includes('comments')) missing.push('comments');
      if (!fieldNames.includes('messages')) missing.push('messages');
      if (missing.length > 0) {
        return {
          ok: false,
          error:
            `App Meta ${appId}: webhook instagram configurado, mas faltam os campos: ${missing.join(', ')}. ` +
            'Abra Casos de uso > instagram_manage_comments > Configurar webhooks e ative comments e messages ' +
            '(necessarios para responder comentarios e enviar DMs).',
        };
      }
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message.trim() : '';
      return {
        ok: false,
        error: msg
          ? `App Meta ${appId}: nao foi possivel verificar o webhook. Detalhe: ${msg}`
          : `App Meta ${appId}: nao foi possivel verificar o webhook.`,
      };
    }
  }

  private async fetchAppSubscriptions(
    appId: string,
    appSecret: string
  ): Promise<
    Array<{
      object: string;
      callback_url: string;
      active: boolean;
      fields: Array<{ name: string; version?: string }>;
    }>
  > {
    const token = `${appId}|${appSecret}`;
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${appId}/subscriptions?access_token=${encodeURIComponent(token)}`
    );
    const body = await res.json();
    if (body.error) {
      throw new Error(body.error.message || JSON.stringify(body.error));
    }
    return Array.isArray(body.data) ? body.data : [];
  }

  updateFlow(orgId: string, id: string, body: UpdateFlowDto, profileId?: string) {
    return this._flowsRepository.updateFlow(orgId, id, body, profileId);
  }

  deleteFlow(orgId: string, id: string, profileId?: string) {
    return this._flowsRepository.deleteFlow(orgId, id, profileId);
  }

  saveCanvas(orgId: string, id: string, body: SaveCanvasDto, profileId?: string) {
    return this._flowsRepository.saveCanvas(
      orgId,
      id,
      body.nodes,
      body.edges,
      profileId
    );
  }

  async updateFlowStatus(
    orgId: string,
    id: string,
    status: FlowStatus,
    profileId?: string
  ) {
    if (status === FlowStatus.ACTIVE) {
      const flow = await this._flowsRepository.getFlow(orgId, id, profileId);
      if (!flow) {
        throw new BadRequestException('Automacao nao encontrada');
      }

      const hasTrigger = flow.nodes.some(
        (n) => n.type === FlowNodeType.TRIGGER
      );
      const hasAction = flow.nodes.some(
        (n) =>
          n.type === FlowNodeType.REPLY_COMMENT ||
          n.type === FlowNodeType.SEND_DM
      );

      if (!hasTrigger) {
        throw new BadRequestException(
          'A automacao precisa ter pelo menos um no de Inicio (Gatilho)'
        );
      }
      if (!hasAction) {
        throw new BadRequestException(
          'A automacao precisa ter pelo menos um no de acao (Responder Comentario ou Enviar DM)'
        );
      }

      // Check for DM → DM direct connections (Meta only allows 1 private reply per comment)
      const dmNodeIds = new Set(
        flow.nodes
          .filter((n) => n.type === FlowNodeType.SEND_DM)
          .map((n) => n.id)
      );
      const hasDmToDm = flow.edges.some(
        (e) => dmNodeIds.has(e.sourceNodeId) && dmNodeIds.has(e.targetNodeId)
      );
      if (hasDmToDm) {
        throw new BadRequestException(
          'A Meta permite apenas 1 mensagem direta por comentario. ' +
            'Remova nos de DM consecutivos e use quebras de linha no campo de mensagem.'
        );
      }

      // Auto-subscribe to Instagram webhooks when activating
      await this.ensureWebhookSubscription(orgId, flow.integrationId);
    }

    return this._flowsRepository.updateFlowStatus(orgId, id, status, profileId);
  }

  private async ensureWebhookSubscription(
    orgId: string,
    integrationId: string
  ) {
    try {
      const integration = await this._integrationService.getIntegrationById(
        orgId,
        integrationId
      );
      if (!integration || integration.providerIdentifier !== 'instagram') {
        return;
      }

      const provider = this._integrationManager.getSocialIntegration(
        'instagram'
      ) as unknown as InstagramProvider;
      if (!provider) {
        this._logger.warn('Instagram provider not found, skipping webhook subscription');
        return;
      }

      await provider.ensureWebhookSubscription(
        integration.token,
        integration.internalId
      );

      this._logger.log(
        `Webhook subscription ensured for integration ${integrationId}`
      );
    } catch (err) {
      // Don't block flow activation if webhook subscription fails
      // The webhook may already be configured manually
      this._logger.warn(
        `Webhook subscription failed for integration ${integrationId}: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    }
  }

  async getInstagramPosts(orgId: string, flowId: string, profileId?: string) {
    const flow = await this._flowsRepository.getFlow(orgId, flowId, profileId);
    if (!flow) {
      throw new BadRequestException('Automacao nao encontrada');
    }

    const integration = await this._integrationService.getIntegrationById(
      orgId,
      flow.integrationId
    );
    if (!integration || integration.providerIdentifier !== 'instagram') {
      return [];
    }

    const provider = this._integrationManager.getSocialIntegration(
      'instagram'
    ) as unknown as InstagramProvider;
    if (!provider) {
      return [];
    }

    try {
      const result = await provider.getRecentMedia(
        integration.internalId,
        integration.token
      );
      return result.posts;
    } catch (err) {
      this._logger.warn(
        `Failed to fetch Instagram posts: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      return [];
    }
  }

  async quickUpdateFlow(orgId: string, id: string, body: QuickCreateFlowDto, profileId?: string) {
    const current = await this._flowsRepository.getFlow(orgId, id, profileId);
    if (!current) {
      throw new BadRequestException('Flow not found');
    }
    await this._flowsRepository.updateFlow(orgId, id, { name: body.name }, profileId);

    const triggerType = body.triggerType ?? 'comment_on_post';
    const nodes: Array<{ type: string; label?: string; positionX: number; positionY: number; data: string }> = [];
    const edges: Array<{ sourceIndex: number; targetIndex: number }> = [];

    const triggerConfig = this.buildTriggerConfig(body);

    nodes.push({
      type: 'TRIGGER',
      label: triggerType,
      positionX: 250,
      positionY: 50,
      data: JSON.stringify(triggerConfig),
    });
    let lastIndex = 0;

    if (triggerType === 'comment_on_post') {
      const replyMsgs = body.replyMessages?.filter(Boolean) ?? (body.replyMessage ? [body.replyMessage] : []);
      if (replyMsgs.length) {
        nodes.push({ type: 'REPLY_COMMENT', positionX: 250, positionY: 50 + nodes.length * 150, data: JSON.stringify({ message: replyMsgs[0], messages: replyMsgs }) });
        edges.push({ sourceIndex: lastIndex, targetIndex: nodes.length - 1 });
        lastIndex = nodes.length - 1;
      }
    }

    if (body.dmMessage) {
      const dmData: Record<string, any> = { message: body.dmMessage };
      if (body.dmButtonText) dmData.buttonText = body.dmButtonText;
      if (body.dmButtonUrl) dmData.buttonUrl = body.dmButtonUrl;
      nodes.push({ type: 'SEND_DM', positionX: 250, positionY: 50 + nodes.length * 150, data: JSON.stringify(dmData) });
      edges.push({ sourceIndex: lastIndex, targetIndex: nodes.length - 1 });
    }

    const flowNodes = nodes.map((n, i) => ({ id: `temp-${i}`, type: n.type as any, label: n.label, positionX: n.positionX, positionY: n.positionY, data: n.data }));
    const flowEdges = edges.map((e, i) => ({ id: `temp-edge-${i}`, sourceNodeId: `temp-${e.sourceIndex}`, targetNodeId: `temp-${e.targetIndex}` }));

    await this._flowsRepository.saveCanvas(orgId, id, flowNodes, flowEdges, profileId);

    // Auto-activate on first wizard save: if the flow was still DRAFT (created
    // via the popup hub which makes an empty draft before the wizard runs),
    // promote it to ACTIVE so the user doesn't need to remember to activate
    // it manually. Flows already ACTIVE or PAUSED keep their current status.
    if (current.status === FlowStatus.DRAFT) {
      await this._flowsRepository.updateFlowStatus(
        orgId,
        id,
        FlowStatus.ACTIVE,
        profileId
      );
    }

    return this._flowsRepository.getFlow(orgId, id, profileId);
  }

  async quickCreateFlow(orgId: string, body: QuickCreateFlowDto, profileId?: string) {
    const check = await this.checkIntegrationWebhook(orgId, body.integrationId);
    if (!check.ok) {
      throw new BadRequestException(check.error);
    }

    const triggerType = body.triggerType ?? 'comment_on_post';
    const triggerIds =
      triggerType === 'story_reply' ? body.storyIds : body.postIds;

    const flow = await this._flowsRepository.createFlow(
      orgId,
      {
        name: body.name,
        integrationId: body.integrationId,
        triggerPostIds:
          body.postMode === 'next_publication' ? undefined : triggerIds,
      },
      profileId
    );

    const nodes: Array<{
      type: string;
      label?: string;
      positionX: number;
      positionY: number;
      data: string;
    }> = [];
    const edges: Array<{ sourceIndex: number; targetIndex: number }> = [];

    // Trigger node
    const triggerConfig = this.buildTriggerConfig(body);

    nodes.push({
      type: 'TRIGGER',
      label: triggerType,
      positionX: 250,
      positionY: 50,
      data: JSON.stringify(triggerConfig),
    });

    let lastIndex = 0;

    // Reply Comment node (only for comment_on_post — stories have no public reply)
    if (triggerType === 'comment_on_post') {
      const replyMsgs = body.replyMessages?.filter(Boolean) ?? (body.replyMessage ? [body.replyMessage] : []);
      if (replyMsgs.length) {
        nodes.push({
          type: 'REPLY_COMMENT',
          positionX: 250,
          positionY: 50 + nodes.length * 150,
          data: JSON.stringify({ message: replyMsgs[0], messages: replyMsgs }),
        });
        edges.push({ sourceIndex: lastIndex, targetIndex: nodes.length - 1 });
        lastIndex = nodes.length - 1;
      }
    }

    // Send DM node
    if (body.dmMessage) {
      const dmData: Record<string, any> = { message: body.dmMessage };
      if (body.dmButtonText) dmData.buttonText = body.dmButtonText;
      if (body.dmButtonUrl) dmData.buttonUrl = body.dmButtonUrl;
      nodes.push({
        type: 'SEND_DM',
        positionX: 250,
        positionY: 50 + nodes.length * 150,
        data: JSON.stringify(dmData),
      });
      edges.push({ sourceIndex: lastIndex, targetIndex: nodes.length - 1 });
    }

    // Save canvas with generated nodes/edges
    const flowNodes = nodes.map((n, i) => ({
      id: `temp-${i}`,
      type: n.type as any,
      label: n.label,
      positionX: n.positionX,
      positionY: n.positionY,
      data: n.data,
    }));
    const flowEdges = edges.map((e, i) => ({
      id: `temp-edge-${i}`,
      sourceNodeId: `temp-${e.sourceIndex}`,
      targetNodeId: `temp-${e.targetIndex}`,
    }));

    await this._flowsRepository.saveCanvas(
      orgId,
      flow.id,
      flowNodes,
      flowEdges,
      profileId
    );

    // Auto-activate new flows created via wizard
    await this._flowsRepository.updateFlowStatus(orgId, flow.id, FlowStatus.ACTIVE, profileId);

    return this._flowsRepository.getFlow(orgId, flow.id, profileId);
  }

  private buildTriggerConfig(body: QuickCreateFlowDto): Record<string, any> {
    const triggerType = body.triggerType ?? 'comment_on_post';
    const triggerConfig: Record<string, any> = { triggerType };

    if (body.postMode === 'next_publication') {
      triggerConfig.mode = 'next_publication';
    } else if (triggerType === 'story_reply' && body.storyIds?.length) {
      triggerConfig.mode = 'specific';
      triggerConfig.storyIds = body.storyIds;
    } else if (triggerType === 'comment_on_post' && body.postIds?.length) {
      triggerConfig.mode = 'specific';
      triggerConfig.postIds = body.postIds;
    } else if (body.postMode === 'all') {
      triggerConfig.mode = 'all';
    }

    if (body.keywords?.length) triggerConfig.keywords = body.keywords;
    if (body.matchMode) triggerConfig.matchMode = body.matchMode;
    if (triggerType === 'story_reply') {
      triggerConfig.matchReactions = body.matchReactions ?? true;
    }
    // The follow-gate flag works for both triggers:
    //   story_reply  -> sends gate text via regular DM
    //   comment_on_post -> sends gate text via private reply (button stripped)
    triggerConfig.requireFollow = body.requireFollow ?? false;
    if (body.followGateMessage !== undefined) {
      triggerConfig.followGateMessage = body.followGateMessage;
    }
    if (body.openingDmMessage !== undefined) {
      triggerConfig.openingDmMessage = body.openingDmMessage;
    }
    if (body.openingDmButtonText !== undefined) {
      triggerConfig.openingDmButtonText = body.openingDmButtonText;
    }
    if (body.alreadyFollowedButtonText !== undefined) {
      triggerConfig.alreadyFollowedButtonText = body.alreadyFollowedButtonText;
    }
    if (body.gateExhaustedMessage !== undefined) {
      triggerConfig.gateExhaustedMessage = body.gateExhaustedMessage;
    }
    if (body.maxGateAttempts !== undefined) {
      triggerConfig.maxGateAttempts = body.maxGateAttempts;
    }

    return triggerConfig;
  }

  private getTriggerType(flow: {
    nodes?: Array<{ type: string; label?: string | null; data: string | null }>;
  }): 'comment_on_post' | 'story_reply' {
    const trigger = flow.nodes?.find((n) => n.type === 'TRIGGER');
    if (trigger?.label === 'story_reply') return 'story_reply';
    if (trigger?.data) {
      try {
        const parsed = JSON.parse(trigger.data);
        if (parsed?.triggerType === 'story_reply') return 'story_reply';
      } catch {
        // ignore
      }
    }
    return 'comment_on_post';
  }

  private isPendingNextPublication(
    flow: {
      triggerPostIds?: string | null;
      nodes?: Array<{ type: string; label?: string | null; data: string | null }>;
    },
    triggerType: 'comment_on_post' | 'story_reply' = 'comment_on_post'
  ): boolean {
    if (flow.triggerPostIds) return false;
    if (this.getTriggerType(flow) !== triggerType) return false;
    const trigger = flow.nodes?.find((n) => n.type === 'TRIGGER');
    if (!trigger?.data) return false;
    try {
      return JSON.parse(trigger.data)?.mode === 'next_publication';
    } catch {
      return false;
    }
  }

  async bindPendingFlowsToPost(
    integrationId: string,
    mediaId: string,
    triggerType: 'comment_on_post' | 'story_reply' = 'comment_on_post'
  ): Promise<number> {
    if (!integrationId || !mediaId) return 0;

    try {
      const pending =
        await this._flowsRepository.findPendingNextPublicationFlows(
          integrationId
        );

      let bound = 0;
      for (const flow of pending) {
        if (!this.isPendingNextPublication(flow, triggerType)) continue;

        const triggerNode = flow.nodes?.find((n) => n.type === 'TRIGGER');
        if (!triggerNode) continue;

        let currentData: Record<string, any> = {};
        try {
          currentData = triggerNode.data ? JSON.parse(triggerNode.data) : {};
        } catch {
          currentData = {};
        }

        const newData: Record<string, any> = {
          ...currentData,
          mode: 'specific',
        };
        if (triggerType === 'story_reply') {
          newData.storyIds = [mediaId];
        } else {
          newData.postIds = [mediaId];
        }

        const ok = await this._flowsRepository.bindFlowTriggerToMedia(
          flow.id,
          triggerNode.id,
          newData,
          mediaId
        );
        if (ok) bound++;
      }

      if (bound > 0) {
        this._logger.log(
          `Bound ${bound} pending next_publication ${triggerType} flow(s) to media ${mediaId} on integration ${integrationId}`
        );
      }
      return bound;
    } catch (err) {
      this._logger.warn(
        `bindPendingFlowsToPost failed for integration ${integrationId} media ${mediaId}: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      return 0;
    }
  }

  async getInstagramPostsByIntegration(
    orgId: string,
    integrationId: string,
    cursor?: string,
    limit = 25
  ) {
    const integration = await this._integrationService.getIntegrationById(
      orgId,
      integrationId
    );
    if (!integration || integration.providerIdentifier !== 'instagram') {
      return { posts: [], nextCursor: null };
    }

    const provider = this._integrationManager.getSocialIntegration(
      'instagram'
    ) as unknown as InstagramProvider;
    if (!provider) {
      return { posts: [], nextCursor: null };
    }

    try {
      return await provider.getRecentMedia(
        integration.internalId,
        integration.token,
        'graph.facebook.com',
        limit,
        cursor
      );
    } catch (err) {
      this._logger.warn(
        `Failed to fetch Instagram posts: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      return { posts: [], nextCursor: null };
    }
  }

  async getInstagramStoriesByIntegration(
    orgId: string,
    integrationId: string
  ) {
    const integration = await this._integrationService.getIntegrationById(
      orgId,
      integrationId
    );
    if (!integration || integration.providerIdentifier !== 'instagram') {
      return { stories: [] };
    }

    const provider = this._integrationManager.getSocialIntegration(
      'instagram'
    ) as unknown as InstagramProvider;
    if (!provider) {
      return { stories: [] };
    }

    try {
      return await provider.getRecentStories(
        integration.internalId,
        integration.token,
        'graph.facebook.com'
      );
    } catch (err) {
      this._logger.warn(
        `Failed to fetch Instagram stories: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      return { stories: [] };
    }
  }

  getExecution(id: string) {
    return this._flowsRepository.getExecution(id);
  }

  appendExecutionLog(
    id: string,
    entry: { nodeId: string; nodeType: string; status: string; timestamp: string; error?: string }
  ) {
    return this._flowsRepository.appendExecutionLog(id, entry);
  }

  getExecutions(flowId: string, page?: number, limit?: number) {
    return this._flowsRepository.getExecutions(flowId, page, limit);
  }

  updateExecution(
    id: string,
    data: {
      status?: FlowExecutionStatus;
      currentNodeId?: string;
      error?: string;
      completedAt?: Date;
    }
  ) {
    return this._flowsRepository.updateExecution(id, data);
  }

  async handleIncomingComment(payload: {
    integrationId: string;
    igCommentId: string;
    igCommenterId: string;
    igCommenterName?: string;
    igMediaId: string;
    commentText: string;
    organizationId: string;
  }) {
    let activeFlows =
      await this._flowsRepository.getActiveFlowsForIntegration(
        payload.integrationId,
        payload.igMediaId
      );

    // Only feed/reel (comment_on_post) flows react to comment webhooks.
    activeFlows = activeFlows.filter(
      (f) => this.getTriggerType(f) === 'comment_on_post'
    );

    // Lazy bind: if any active flow is still pending in next_publication mode,
    // bind it to this mediaId before matching. Comments only arrive on feed/reel
    // (stories use messages/story_insights), so it's safe to treat this as the
    // "next publication" signal without fetching media_type.
    const hasPending = activeFlows.some((f) =>
      this.isPendingNextPublication(f, 'comment_on_post')
    );
    if (hasPending) {
      await this.bindPendingFlowsToPost(
        payload.integrationId,
        payload.igMediaId,
        'comment_on_post'
      );
      activeFlows = (
        await this._flowsRepository.getActiveFlowsForIntegration(
          payload.integrationId,
          payload.igMediaId
        )
      ).filter((f) => this.getTriggerType(f) === 'comment_on_post');
    }

    // Filter flows that monitor this specific media (or all posts)
    const matchingFlows = activeFlows.filter((flow) => {
      // Defense-in-depth: a flow still pending in next_publication must NOT
      // fire as "all posts" — skip it entirely if the bind didn't take.
      if (this.isPendingNextPublication(flow, 'comment_on_post')) return false;
      if (!flow.triggerPostIds) return true;
      try {
        const postIds: string[] = JSON.parse(flow.triggerPostIds);
        return postIds.length === 0 || postIds.includes(payload.igMediaId);
      } catch {
        return true;
      }
    });

    const results = [];
    for (const flow of matchingFlows) {
      // Idempotency: skip if already executed for this comment+flow
      const existing = await this._flowsRepository.findExistingExecution(
        flow.id,
        payload.igCommentId
      );
      if (existing) continue;

      const workflowId = `flow-exec-${flow.id}-${payload.igCommentId}`;

      const execution = await this._flowsRepository.createExecution({
        flowId: flow.id,
        temporalWorkflowId: workflowId,
        triggerType: 'comment_on_post',
        igCommentId: payload.igCommentId,
        igCommenterId: payload.igCommenterId,
        igCommenterName: payload.igCommenterName,
        igMediaId: payload.igMediaId,
        commentText: payload.commentText,
      });

      try {
        await this._temporalService.client
          .getRawClient()
          ?.workflow.start('flowExecutionWorkflow', {
            workflowId,
            taskQueue: 'main',
            args: [
              {
                executionId: execution.id,
                flowId: flow.id,
                triggerType: 'comment_on_post',
                igCommentId: payload.igCommentId,
                igCommenterId: payload.igCommenterId,
                igCommenterName: payload.igCommenterName,
                igMediaId: payload.igMediaId,
                commentText: payload.commentText,
                integrationId: payload.integrationId,
              },
            ],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: orgSearchAttr,
                value: payload.organizationId,
              },
            ]),
          });
      } catch (err) {
        await this._flowsRepository.updateExecution(execution.id, {
          status: FlowExecutionStatus.FAILED,
          error: err instanceof Error ? err.message : 'Failed to start workflow',
          completedAt: new Date(),
        });
      }

      results.push(execution);
    }

    return results;
  }

  async handleIncomingStoryReply(payload: {
    integrationId: string;
    organizationId: string;
    igThreadId?: string;
    igMessageId: string;
    igSenderId: string;
    igSenderName?: string;
    igStoryId: string;
    messageText: string;
    reaction?: string;
  }) {
    let activeFlows =
      await this._flowsRepository.getActiveFlowsForIntegration(
        payload.integrationId,
        payload.igStoryId
      );

    // Only story_reply flows react to story webhooks.
    activeFlows = activeFlows.filter(
      (f) => this.getTriggerType(f) === 'story_reply'
    );

    // Lazy bind: pending next_publication flows get bound to this storyId.
    const hasPending = activeFlows.some((f) =>
      this.isPendingNextPublication(f, 'story_reply')
    );
    if (hasPending) {
      await this.bindPendingFlowsToPost(
        payload.integrationId,
        payload.igStoryId,
        'story_reply'
      );
      activeFlows = (
        await this._flowsRepository.getActiveFlowsForIntegration(
          payload.integrationId,
          payload.igStoryId
        )
      ).filter((f) => this.getTriggerType(f) === 'story_reply');
    }

    // Filter flows that monitor this specific story (or all stories)
    const matchingFlows = activeFlows.filter((flow) => {
      if (this.isPendingNextPublication(flow, 'story_reply')) return false;
      if (!flow.triggerPostIds) return true;
      try {
        const storyIds: string[] = JSON.parse(flow.triggerPostIds);
        return storyIds.length === 0 || storyIds.includes(payload.igStoryId);
      } catch {
        return true;
      }
    });

    // Keyword / reaction matching honoring node config
    const triggerText = (payload.messageText || payload.reaction || '').toLowerCase();
    const isReaction = !!payload.reaction && !payload.messageText;
    const finalFlows = matchingFlows.filter((flow) => {
      const trigger = flow.nodes?.find((n) => n.type === 'TRIGGER');
      if (!trigger?.data) return true;
      let cfg: Record<string, any> = {};
      try {
        cfg = JSON.parse(trigger.data);
      } catch {
        return true;
      }

      if (isReaction && cfg.matchReactions === false) return false;

      const keywords: string[] = Array.isArray(cfg.keywords) ? cfg.keywords : [];
      if (!keywords.length) return true;

      const normalized = keywords.map((k) => String(k).toLowerCase());
      if (cfg.matchMode === 'all') {
        return normalized.every((k) => triggerText.includes(k));
      }
      return normalized.some((k) => triggerText.includes(k));
    });

    const results = [];
    for (const flow of finalFlows) {
      const existing =
        await this._flowsRepository.findExistingExecutionByMessage(
          flow.id,
          payload.igMessageId
        );
      if (existing) continue;

      const workflowId = `flow-exec-${flow.id}-${payload.igMessageId}`;

      const execution = await this._flowsRepository.createExecution({
        flowId: flow.id,
        temporalWorkflowId: workflowId,
        triggerType: 'story_reply',
        igCommenterId: payload.igSenderId,
        igCommenterName: payload.igSenderName,
        igMediaId: payload.igStoryId,
        igThreadId: payload.igThreadId,
        igMessageId: payload.igMessageId,
        commentText: payload.messageText || payload.reaction || '',
      });

      try {
        await this._temporalService.client
          .getRawClient()
          ?.workflow.start('flowExecutionWorkflow', {
            workflowId,
            taskQueue: 'main',
            args: [
              {
                executionId: execution.id,
                flowId: flow.id,
                triggerType: 'story_reply',
                igSenderId: payload.igSenderId,
                igSenderName: payload.igSenderName,
                igStoryId: payload.igStoryId,
                igThreadId: payload.igThreadId,
                igMessageId: payload.igMessageId,
                messageText: payload.messageText,
                reaction: payload.reaction,
                integrationId: payload.integrationId,
              },
            ],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: orgSearchAttr,
                value: payload.organizationId,
              },
            ]),
          });
      } catch (err) {
        await this._flowsRepository.updateExecution(execution.id, {
          status: FlowExecutionStatus.FAILED,
          error: err instanceof Error ? err.message : 'Failed to start workflow',
          completedAt: new Date(),
        });
      }

      results.push(execution);
    }

    return results;
  }

  // --- Follow-gate em 2 etapas (postback) ---

  /**
   * Gera um payload curto (<=23 chars) assinado com HMAC. Formato:
   *   pb_<12 chars base64url>_<8 chars hex>
   * O prefixo `pb_` permite filtrar trafico alheio no webhook sem fazer
   * lookup no banco. O sufixo HMAC impede que um atacante externo forje
   * payloads (ver verifyPostbackPayload).
   */
  private generatePostbackPayload(): { payload: string; payloadHmac: string } {
    const shortId = crypto.randomBytes(9).toString('base64url'); // 12 chars
    const secret = this.getPostbackSecret();
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(shortId)
      .digest('hex')
      .slice(0, 8);
    return { payload: `pb_${shortId}_${hmac}`, payloadHmac: hmac };
  }

  /**
   * Valida que o payload tem formato esperado e HMAC correto. Retorna false
   * para formato invalido ou assinatura inconsistente. Usa comparacao de tempo
   * constante para evitar leak via timing.
   */
  private verifyPostbackPayload(payload: string): boolean {
    const match = payload.match(/^pb_([A-Za-z0-9_-]{12})_([a-f0-9]{8})$/);
    if (!match) return false;
    const [, shortId, providedHmac] = match;
    const secret = this.getPostbackSecret();
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(shortId)
      .digest('hex')
      .slice(0, 8);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedHmac),
        Buffer.from(expectedHmac)
      );
    } catch {
      return false;
    }
  }

  private getPostbackSecret(): string {
    return (
      process.env.POSTBACK_SIGNING_SECRET ||
      process.env.FACEBOOK_APP_SECRET ||
      'dev-only-fallback-postback-secret'
    );
  }

  /**
   * Cria um PendingPostback com payload assinado. Retorna a linha
   * persistida para o caller usar o `payload` como botao e o `id`
   * para referencia. Chamado pela activity `createPendingPostback`.
   */
  async createPendingPostback(input: {
    flowId: string;
    originExecutionId: string;
    integrationId: string;
    organizationId: string;
    igSenderId: string;
    igCommenterName?: string;
    igMediaId?: string;
    igCommentId?: string;
    kind?: string;
    attemptCount?: number;
    maxAttempts?: number;
    snapshotFinalDm?: string;
    snapshotFinalBtnText?: string;
    snapshotFinalBtnUrl?: string;
    snapshotGateDm?: string;
    snapshotAlreadyBtnText?: string;
    snapshotExhaustedMessage?: string;
    openingDmMessage?: string;
    openingDmButtonText?: string;
  }): Promise<PendingPostback> {
    const { payload, payloadHmac } = this.generatePostbackPayload();
    const expiresAt = new Date(Date.now() + POSTBACK_EXPIRATION_MS);
    return this._flowsRepository.createPendingPostback({
      ...input,
      payload,
      payloadHmac,
      expiresAt,
    });
  }

  getPendingPostback(id: string) {
    return this._flowsRepository.findPostbackById(id);
  }

  consumePendingPostback(id: string) {
    return this._flowsRepository.consumePostback(id);
  }

  abandonPendingPostback(id: string) {
    return this._flowsRepository.abandonPostback(id);
  }

  incrementPostbackAttempt(id: string) {
    return this._flowsRepository.incrementPostbackAttempt(id);
  }

  expirePendingPostbacks(now?: Date) {
    return this._flowsRepository.expirePendingPostbacks(now);
  }

  /**
   * Processa um clique no botao postback. Validacoes em ordem:
   *   1. Formato/HMAC do payload (bloqueia spoofing externo)
   *   2. Existencia no banco
   *   3. Status = PENDING (nao foi consumido, abandonado ou expirado)
   *   4. expiresAt > agora (janela Meta ainda aberta)
   *   5. Dedupe de re-entrega pelo `metaMid` (update atomico)
   * Se tudo ok, dispara o workflow `followGateResolveWorkflow` e retorna
   * silenciosamente 200 OK para a Meta nao reenviar.
   */
  async handlePostbackClick(input: {
    payload: string;
    metaMid?: string;
    senderIgsid: string;
    igAccountId: string;
  }): Promise<void> {
    if (!input.payload.startsWith('pb_')) return;

    if (!this.verifyPostbackPayload(input.payload)) {
      this._logger.warn(
        `Postback with invalid HMAC received from sender=${input.senderIgsid}: ${input.payload}`
      );
      return;
    }

    const pending = await this._flowsRepository.findPostbackByPayload(
      input.payload
    );
    if (!pending) {
      this._logger.warn(
        `Postback payload has valid HMAC but no pending row found: ${input.payload}`
      );
      return;
    }

    if (pending.status !== PendingPostbackStatus.PENDING) {
      this._logger.log(
        `Postback ${pending.id} already in status ${pending.status}, ignoring click`
      );
      return;
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      this._logger.log(
        `Postback ${pending.id} expired at ${pending.expiresAt.toISOString()}, marking EXPIRED`
      );
      await this._flowsRepository.expirePendingPostbacks();
      return;
    }

    // Dedupe webhook re-delivery by mid. When Meta retries the webhook, the
    // same mid arrives twice; markMetaMidIfUnconsumed returns false on retry.
    if (input.metaMid) {
      const isFirst = await this._flowsRepository.markMetaMidIfUnconsumed(
        input.payload,
        input.metaMid
      );
      if (!isFirst) {
        this._logger.log(
          `Postback ${pending.id}: duplicate Meta delivery mid=${input.metaMid}, ignoring`
        );
        return;
      }
    }

    const workflowId = `follow-gate-resolve-${pending.id}`;
    try {
      await this._temporalService.client
        .getRawClient()
        ?.workflow.start('followGateResolveWorkflow', {
          workflowId,
          taskQueue: 'main',
          args: [{ pendingPostbackId: pending.id }],
          typedSearchAttributes: new TypedSearchAttributes([
            {
              key: orgSearchAttr,
              value: pending.organizationId,
            },
          ]),
        });
      this._logger.log(
        `Postback ${pending.id}: dispatched ${workflowId} for execution ${pending.originExecutionId}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // Workflow ID already running means Meta delivered the same click to
      // a second worker before the mid dedupe caught it — safe to ignore.
      if (msg.includes('WorkflowAlreadyStarted') || msg.includes('already started')) {
        this._logger.log(
          `Postback ${pending.id}: workflow ${workflowId} already running (expected on retry)`
        );
        return;
      }
      this._logger.warn(
        `Postback ${pending.id}: failed to start resolve workflow: ${msg}`
      );
    }
  }
}
