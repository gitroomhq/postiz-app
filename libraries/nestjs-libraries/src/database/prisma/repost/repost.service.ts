import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import {
  RepostDestinationFormat,
  RepostSourceType,
} from '@prisma/client';
import { organizationId as organizationIdKey } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { RepostRepository } from '@gitroom/nestjs-libraries/database/prisma/repost/repost.repository';
import {
  PROVIDER_DESTINATION_FORMATS,
  PROVIDER_SOURCE_TYPES,
  REPOST_DESTINATION_PROVIDERS,
  REPOST_SOURCE_PROVIDERS,
  SOURCE_DESTINATION_MATRIX,
  formatsForProvider,
  formatsForSourceType,
  isDestinationCompatible,
  sourceTypesForProvider,
} from '@gitroom/nestjs-libraries/database/prisma/repost/repost.matrix';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { InstagramMessagingService } from '@gitroom/nestjs-libraries/integrations/social/instagram-messaging.service';
import { resolveIgRoute } from '@gitroom/nestjs-libraries/integrations/social/instagram-route.resolver';
import type { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';
import {
  CreateRepostRuleDto,
  RepostDestinationDto,
  UpdateRepostRuleDto,
} from '@gitroom/nestjs-libraries/dtos/repost/repost.rule.dto';

const WORKFLOW_NAME = 'repostWorkflow';
const workflowIdOf = (ruleId: string) => `repost-rule-${ruleId}`;

// Re-export para compatibilidade com imports antigos no frontend/orchestrator.
export const REPOST_SOURCE_IDENTIFIERS = REPOST_SOURCE_PROVIDERS;
export const REPOST_DESTINATION_IDENTIFIERS = REPOST_DESTINATION_PROVIDERS;

@Injectable()
export class RepostService {
  constructor(
    private _repostRepository: RepostRepository,
    private _temporalService: TemporalService,
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager,
    private _instagramMessagingService: InstagramMessagingService
  ) {}

  getRules(orgId: string, profileId?: string) {
    return this._repostRepository.getRules(orgId, profileId);
  }

  async getRule(orgId: string, id: string, profileId?: string) {
    const rule = await this._repostRepository.getRuleById(id, orgId, profileId);
    if (!rule) {
      throw new NotFoundException('Repost rule not found');
    }
    return rule;
  }

  getRuleFresh(id: string) {
    return this._repostRepository.getRuleFresh(id);
  }

  /**
   * Candidatos de ORIGEM: cada integracao IG vira N entradas (uma por
   * sourceType suportado). Frontend mostra "Instagram — Story" e
   * "Instagram — Reel/Feed" como itens separados.
   */
  async sourceCandidates(orgId: string, profileId?: string) {
    const integrations = await this._integrationService.getIntegrationsList(
      orgId,
      profileId
    );
    const options: Array<{
      key: string;
      integrationId: string;
      sourceType: RepostSourceType;
      name: string;
      picture: string | null;
      providerIdentifier: string;
    }> = [];
    for (const i of integrations) {
      if (i.disabled || i.deletedAt) continue;
      const types = sourceTypesForProvider(i.providerIdentifier);
      for (const t of types) {
        options.push({
          key: `${i.id}:${t}`,
          integrationId: i.id,
          sourceType: t,
          name: i.name,
          picture: i.picture,
          providerIdentifier: i.providerIdentifier,
        });
      }
    }
    return options;
  }

  /**
   * Candidatos de DESTINO, filtrados por sourceType. Cada integracao
   * vira N entradas (uma por formato compativel). A interseccao
   * PROVIDER_DESTINATION_FORMATS x SOURCE_DESTINATION_MATRIX garante
   * que so formatos viaveis aparecam.
   */
  async destinationCandidates(
    orgId: string,
    sourceType?: RepostSourceType,
    profileId?: string
  ) {
    const integrations = await this._integrationService.getIntegrationsList(
      orgId,
      profileId
    );
    const allowedBySource = sourceType
      ? new Set(formatsForSourceType(sourceType))
      : null;

    const options: Array<{
      key: string;
      integrationId: string;
      format: RepostDestinationFormat;
      name: string;
      picture: string | null;
      providerIdentifier: string;
    }> = [];

    for (const i of integrations) {
      if (i.disabled || i.deletedAt) continue;
      const providerFormats = formatsForProvider(i.providerIdentifier);
      for (const f of providerFormats) {
        if (allowedBySource && !allowedBySource.has(f)) continue;
        options.push({
          key: `${i.id}:${f}`,
          integrationId: i.id,
          format: f,
          name: i.name,
          picture: i.picture,
          providerIdentifier: i.providerIdentifier,
        });
      }
    }
    return options;
  }

  async createRule(
    orgId: string,
    profileId: string | undefined,
    body: CreateRepostRuleDto
  ) {
    if (!profileId) {
      throw new BadRequestException(
        'A repost rule must belong to a specific profile'
      );
    }

    await this.assertValidSource(
      orgId,
      profileId,
      body.sourceIntegrationId,
      body.sourceType
    );
    await this.assertValidDestinations(
      orgId,
      profileId,
      body.sourceType,
      body.destinations
    );

    const rule = await this._repostRepository.createRule(
      orgId,
      profileId,
      body
    );

    // Bootstrap do checkpoint: sem isso, o primeiro ciclo pegaria todos os
    // itens ativos como "novos". Com o bootstrap, so conteudo publicado
    // apos a criacao da regra sera repostado.
    await this.bootstrapCheckpoint(rule.id);

    if (rule.enabled) {
      await this.processCron(true, orgId, rule.id);
    }

    return this._repostRepository.getRuleFresh(rule.id);
  }

  async updateRule(
    orgId: string,
    id: string,
    body: UpdateRepostRuleDto,
    profileId?: string
  ) {
    const existing = await this.getRule(orgId, id, profileId);

    const nextSourceType = body.sourceType ?? existing.sourceType;

    if (body.sourceIntegrationId || body.sourceType) {
      await this.assertValidSource(
        orgId,
        existing.profileId,
        body.sourceIntegrationId ?? existing.sourceIntegrationId,
        nextSourceType
      );
    }
    if (body.destinations) {
      await this.assertValidDestinations(
        orgId,
        existing.profileId,
        nextSourceType,
        body.destinations
      );
    }

    const updated = await this._repostRepository.updateRule(
      orgId,
      id,
      body,
      profileId
    );

    if (body.enabled !== undefined) {
      await this.processCron(body.enabled, orgId, id);
    }

    return updated;
  }

  async toggleRule(
    orgId: string,
    id: string,
    enabled: boolean,
    profileId?: string
  ) {
    await this.getRule(orgId, id, profileId);
    const updated = await this._repostRepository.toggleRule(
      orgId,
      id,
      enabled,
      profileId
    );
    await this.processCron(enabled, orgId, id);
    return updated;
  }

  async deleteRule(orgId: string, id: string, profileId?: string) {
    await this.getRule(orgId, id, profileId);
    await this._repostRepository.softDeleteRule(orgId, id, profileId);
    await this.processCron(false, orgId, id);
    return { success: true };
  }

  async runNow(orgId: string, id: string, profileId?: string) {
    const rule = await this.getRule(orgId, id, profileId);
    if (!rule.enabled) {
      throw new BadRequestException(
        'Enable the rule before running a manual cycle'
      );
    }
    try {
      await this._temporalService.client
        .getRawClient()
        ?.workflow.signalWithStart(WORKFLOW_NAME, {
          workflowId: workflowIdOf(id),
          taskQueue: 'main',
          signal: 'pokeRepost',
          signalArgs: [],
          args: [{ ruleId: id }],
          workflowIdConflictPolicy: 'USE_EXISTING',
          typedSearchAttributes: new TypedSearchAttributes([
            { key: organizationIdKey, value: orgId },
          ]),
        });
    } catch (err) {
      console.error(
        `[repost] runNow signal failed rule=${id}:`,
        (err as Error).message || err
      );
      return { success: false };
    }
    return { success: true };
  }

  getLogs(
    orgId: string,
    id: string,
    page: number,
    size: number,
    profileId?: string
  ) {
    return this.getRule(orgId, id, profileId).then(async () => ({
      rows: await this._repostRepository.getLogs(id, page, size),
      total: await this._repostRepository.countLogs(id),
      page,
      size,
    }));
  }

  async advanceCheckpoint(id: string, lastSourceItemId: string) {
    return this._repostRepository.advanceCheckpoint(id, lastSourceItemId);
  }

  touchLastRun(id: string) {
    return this._repostRepository.touchLastRun(id);
  }

  async resetCheckpoint(orgId: string, id: string, profileId?: string) {
    await this.getRule(orgId, id, profileId);
    await this._repostRepository.clearCheckpoint(id);
    return { success: true };
  }

  private async bootstrapCheckpoint(ruleId: string) {
    const rule = await this._repostRepository.getRuleFresh(ruleId);
    if (!rule) return;

    try {
      const integration = await this._integrationService.getIntegrationById(
        rule.organizationId,
        rule.sourceIntegrationId
      );
      if (!integration) return;

      const route = await resolveIgRoute(
        integration as any,
        this._instagramMessagingService
      );
      const provider = this._integrationManager.getSocialIntegration(
        'instagram'
      ) as unknown as InstagramProvider | undefined;
      if (!provider) return;

      let items: Array<{ id: string; timestamp?: string }> = [];
      if (rule.sourceType === 'INSTAGRAM_STORY') {
        const { stories } = await provider.getRecentStories(
          integration.internalId,
          route.token,
          route.host
        );
        items = stories;
      } else if (rule.sourceType === 'INSTAGRAM_POST') {
        // getRecentMedia(igAccountId, accessToken, type, limit?, after?).
        // `route.host` eh o 3o parametro (type), nao o 4o (limit).
        const { posts } = await (provider as any).getRecentMedia(
          integration.internalId,
          route.token,
          route.host
        );
        items = posts ?? [];
      }

      console.log(
        `[repost] bootstrap rule=${ruleId} sourceType=${rule.sourceType} ` +
          `host=${route.host} items=${items.length}`
      );
      if (!items.length) return;

      // Checkpoint guarda timestamp (ISO 8601), nao id. Snowflakes do IG
      // nao sao monotonicamente crescentes por tempo.
      const latest = items.reduce((acc, cur) =>
        (cur.timestamp || '') > (acc.timestamp || '') ? cur : acc
      );
      if (latest?.timestamp) {
        console.log(
          `[repost] bootstrap rule=${ruleId} checkpoint set to ${latest.timestamp}`
        );
        await this._repostRepository.advanceCheckpoint(ruleId, latest.timestamp);
      }
    } catch (err) {
      console.error(
        `[repost] bootstrap rule=${ruleId} failed:`,
        (err as Error).message || err
      );
    }
  }

  private async processCron(active: boolean, orgId: string, id: string) {
    if (active) {
      try {
        return await this._temporalService.client
          .getRawClient()
          ?.workflow.start(WORKFLOW_NAME, {
            workflowId: workflowIdOf(id),
            taskQueue: 'main',
            args: [{ ruleId: id }],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationIdKey,
                value: orgId,
              },
            ]),
          });
      } catch (err) {
        return null;
      }
    }

    try {
      return await this._temporalService.terminateWorkflow(workflowIdOf(id));
    } catch (err) {
      return false;
    }
  }

  private async assertValidSource(
    orgId: string,
    profileId: string,
    integrationId: string,
    sourceType: RepostSourceType
  ) {
    const integrations = await this._integrationService.getIntegrationsList(
      orgId,
      profileId
    );
    const found = integrations.find((i) => i.id === integrationId);
    if (!found) {
      throw new BadRequestException(
        'Source integration not found for this profile'
      );
    }
    const supported = sourceTypesForProvider(found.providerIdentifier);
    if (!supported.includes(sourceType)) {
      throw new BadRequestException(
        `Provider ${found.providerIdentifier} cannot serve as source for ${sourceType}`
      );
    }
  }

  private async assertValidDestinations(
    orgId: string,
    profileId: string,
    sourceType: RepostSourceType,
    destinations: RepostDestinationDto[]
  ) {
    const integrations = await this._integrationService.getIntegrationsList(
      orgId,
      profileId
    );
    const byId = new Map(integrations.map((i) => [i.id, i]));
    const allowedBySource = SOURCE_DESTINATION_MATRIX[sourceType] ?? [];

    for (const dest of destinations) {
      const integration = byId.get(dest.integrationId);
      if (!integration) {
        throw new BadRequestException(
          `Destination integration ${dest.integrationId} does not belong to this profile`
        );
      }
      if (
        !isDestinationCompatible(
          sourceType,
          integration.providerIdentifier,
          dest.format
        )
      ) {
        throw new BadRequestException(
          `Destination ${integration.providerIdentifier} cannot publish ${dest.format} for source ${sourceType}`
        );
      }
      if (!allowedBySource.includes(dest.format)) {
        throw new BadRequestException(
          `Format ${dest.format} is not allowed for source ${sourceType}`
        );
      }
    }
  }
}
