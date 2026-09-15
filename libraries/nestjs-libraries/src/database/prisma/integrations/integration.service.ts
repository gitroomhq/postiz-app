import {
  forwardRef,
  HttpException,
  Logger,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  AnalyticsData,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { Integration, Organization } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import dayjs from 'dayjs';
import { timer } from '@gitroom/helpers/utils/timer';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import {
  Disconnect,
  NotEnoughScopes,
  RefreshToken,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { IntegrationTimeDto } from '@gitroom/nestjs-libraries/dtos/integrations/integration.time.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { PlugDto } from '@gitroom/nestjs-libraries/dtos/plugs/plug.dto';
import { difference, uniq } from 'lodash';
import utc from 'dayjs/plugin/utc';
import { AutopostRepository } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { TemporalService } from 'nestjs-temporal-core';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { providerPageSelections } from '@gitroom/nestjs-libraries/integrations/provider-page-selections';

dayjs.extend(utc);

@Injectable()
export class IntegrationService {
  private storage = UploadFactory.createStorage();
  constructor(
    private _integrationRepository: IntegrationRepository,
    private _autopostsRepository: AutopostRepository,
    private _integrationManager: IntegrationManager,
    private _notificationService: NotificationService,
    @Inject(forwardRef(() => RefreshIntegrationService))
    private _refreshIntegrationService: RefreshIntegrationService,
    private _temporalService: TemporalService
  ) {}

  /**
   * Stop every autopost rule for an organization that has lost the capability.
   *
   * Writes the row, not just the workflow. Terminating the execution alone left
   * `active: true` in the database, so Settings kept drawing the rule as On with
   * nothing behind it — and if the organization ever came back to a paid tier,
   * nothing restarted it, because as far as the row was concerned it had never
   * stopped.
   *
   * The terminate is still allowed to fail — a rule whose workflow is already
   * gone is the normal case, not an error — but the row is written either way,
   * and a genuine Temporal outage is now logged rather than swallowed whole.
   */
  async changeActiveCron(orgId: string) {
    const data = await this._autopostsRepository.getAutoposts(orgId);

    for (const item of data.filter((f) => f.active)) {
      try {
        await this._temporalService.terminateWorkflow(`autopost-${item.id}`);
      } catch (err) {
        Logger.warn(
          `Could not terminate autopost-${item.id}: ${
            (err as Error)?.message || err
          }`
        );
      }
      await this._autopostsRepository.changeActive(orgId, item.id, false);
    }

    return true;
  }

  getMentions(platform: string, q: string) {
    return this._integrationRepository.getMentions(platform, q);
  }

  insertMentions(
    platform: string,
    mentions: { name: string; username: string; image: string }[]
  ) {
    return this._integrationRepository.insertMentions(platform, mentions);
  }

  async setTimes(
    orgId: string,
    integrationId: string,
    times: IntegrationTimeDto
  ) {
    return this._integrationRepository.setTimes(orgId, integrationId, times);
  }

  updateProviderSettings(org: string, id: string, additionalSettings: string) {
    return this._integrationRepository.updateProviderSettings(
      org,
      id,
      additionalSettings
    );
  }

  checkPreviousConnections(org: string, id: string) {
    return this._integrationRepository.checkPreviousConnections(org, id);
  }

  async createOrUpdateIntegration(
    additionalSettings:
      | {
          title: string;
          description: string;
          type: 'checkbox' | 'text' | 'textarea';
          value: any;
          regex?: string;
        }[]
      | undefined,
    oneTimeToken: boolean,
    org: string,
    name: string,
    picture: string | undefined,
    type: 'article' | 'social',
    internalId: string,
    provider: string,
    token: string,
    refreshToken = '',
    expiresIn?: number,
    username?: string,
    isBetweenSteps = false,
    refresh?: string,
    timezone?: number,
    customInstanceDetails?: string
  ) {
    // Pictures already on Cloudflare Images are kept as they are. The host is
    // compared as a hostname: a URL that merely contains the name somewhere is
    // re-hosted like any other.
    const onCloudflareImages = (() => {
      try {
        const host = new URL(picture || '').hostname;
        return host === 'imagedelivery.net' || host.endsWith('.imagedelivery.net');
      } catch {
        return false;
      }
    })();

    const uploadedPicture = picture
      ? onCloudflareImages
        ? picture
        : await this.storage.uploadSimple(picture).catch((err) => {
            console.log('Failed to upload profile picture:', picture, err);
            return undefined;
          })
      : undefined;

    return this._integrationRepository.createOrUpdateIntegration(
      additionalSettings,
      oneTimeToken,
      org,
      name,
      uploadedPicture,
      type,
      internalId,
      provider,
      token,
      refreshToken,
      expiresIn,
      username,
      isBetweenSteps,
      refresh,
      timezone,
      customInstanceDetails
    );
  }

  updateIntegrationGroup(org: string, id: string, group: string) {
    return this._integrationRepository.updateIntegrationGroup(org, id, group);
  }

  updateOnCustomerName(org: string, id: string, name: string) {
    return this._integrationRepository.updateOnCustomerName(org, id, name);
  }

  getIntegrationsList(org: string) {
    return this._integrationRepository.getIntegrationsList(org);
  }

  getIntegrationForOrder(id: string, order: string, user: string, org: string) {
    return this._integrationRepository.getIntegrationForOrder(
      id,
      order,
      user,
      org
    );
  }

  updateNameAndUrl(id: string, name: string, url: string) {
    return this._integrationRepository.updateNameAndUrl(id, name, url);
  }

  getIntegrationById(org: string, id: string) {
    return this._integrationRepository.getIntegrationById(org, id);
  }

  async refreshToken(provider: SocialProvider, refresh: string) {
    try {
      const { refreshToken, accessToken, expiresIn } =
        await provider.refreshToken(refresh);

      if (!refreshToken || !accessToken || !expiresIn) {
        return false;
      }

      return { refreshToken, accessToken, expiresIn };
    } catch (e) {
      return false;
    }
  }

  async disconnectChannel(orgId: string, integration: Integration, err = '') {
    await this._integrationRepository.disconnectChannel(orgId, integration.id);
    await this.informAboutRefreshError(orgId, integration, err);
  }

  // A reconnect that came back from a different provider (MIGRATE_PROVIDERS):
  // match the disconnected channel by profile and move it to the new provider
  // in place, so scheduled posts, settings and customers survive. Throws the
  // same error as a mismatched reconnect when the migration is not configured
  // or the user connected a different account.
  async migrateIntegration(
    org: string,
    oldInternalId: string,
    newProvider: string,
    auth: { id: string; username: string }
  ) {
    const existing = await this._integrationRepository.getIntegrationByInternalId(
      org,
      oldInternalId
    );

    if (
      !existing ||
      this._integrationManager.getMigrationTarget(
        existing.providerIdentifier
      ) !== newProvider
    ) {
      throw new NotEnoughScopes(
        'Please refresh the channel that needs to be refreshed'
      );
    }

    const oldProvider = this._integrationManager.getSocialIntegration(
      existing.providerIdentifier
    );

    if (!oldProvider.migrationMatch(auth, existing)) {
      throw new NotEnoughScopes(
        `Please connect the same account (@${existing.profile}) that needs to be refreshed`
      );
    }

    if (
      await this._integrationRepository.getIntegrationByInternalId(org, auth.id)
    ) {
      throw new NotEnoughScopes(
        'This account is already connected as another channel, please delete one of them first'
      );
    }

    return this._integrationRepository.migrateIntegration(
      org,
      existing.id,
      auth.id,
      newProvider,
      existing.rootInternalId === existing.internalId
        ? auth.id
        : existing.rootInternalId
    );
  }

  // A fresh connect of a migration target (MIGRATE_PROVIDERS) for an account
  // the org already has on the source provider: adopt that channel instead of
  // creating a confusing duplicate - the channel is migrated in place exactly
  // like a reconnect, and the follow-up upsert stores the fresh tokens. A no-op
  // when nothing matches, so a genuinely new account still creates a channel.
  async migrateIntegrationOnConnect(
    org: string,
    newProvider: string,
    auth: { id: string; username: string }
  ) {
    const sources = this._integrationManager.getMigrationSources(newProvider);
    if (
      !sources.length ||
      this._integrationManager.getSocialIntegration(newProvider).isBetweenSteps
    ) {
      return;
    }

    // the account already exists on the new provider: the normal upsert
    // updates it, nothing to adopt
    if (
      await this._integrationRepository.getIntegrationByInternalId(org, auth.id)
    ) {
      return;
    }

    const existing = (
      await this._integrationRepository.getIntegrationsList(org)
    ).find(
      (p) =>
        sources.includes(p.providerIdentifier) &&
        this._integrationManager
          .getSocialIntegration(p.providerIdentifier)
          .migrationMatch(auth, p)
    );

    if (!existing) {
      return;
    }

    return this._integrationRepository.migrateIntegration(
      org,
      existing.id,
      auth.id,
      newProvider,
      existing.rootInternalId === existing.internalId
        ? auth.id
        : existing.rootInternalId
    );
  }

  async informAboutRefreshError(
    orgId: string,
    integration: Integration,
    err = ''
  ) {
    const providerName = (
      this._integrationManager.getSocialIntegration(
        integration.providerIdentifier
      )?.name || integration.providerIdentifier
    )
      .split('\n')[0]
      .trim();
    const account = integration.name?.trim();
    const who =
      account && account.toLowerCase() !== providerName.toLowerCase()
        ? ` (${account})`
        : '';
    const message = `Could not refresh your ${providerName} channel${who}. Reconnect it to keep publishing.`;
    const params = new URLSearchParams();
    params.set('channel', integration.providerIdentifier);
    params.set('focus', integration.id);
    const link = `/channels?${params.toString()}`;
    await this._notificationService.inAppNotification(
      orgId,
      message,
      message,
      true,
      false,
      'info',
      link
    );
    if (err?.trim()) {
      console.error(
        `[integrations] refresh failed for ${integration.providerIdentifier} ${integration.id}: ${err.trim()}`
      );
    }
  }

  async refreshNeeded(org: string, id: string) {
    return this._integrationRepository.refreshNeeded(org, id);
  }

  async setBetweenRefreshSteps(id: string) {
    return this._integrationRepository.setBetweenRefreshSteps(id);
  }

  async refreshTokens() {
    const integrations = await this._integrationRepository.needsToBeRefreshed();
    for (const integration of integrations) {
      const provider = this._integrationManager.getSocialIntegration(
        integration.providerIdentifier
      );

      const data = await this.refreshToken(provider, integration.refreshToken!);

      if (!data) {
        await this.informAboutRefreshError(
          integration.organizationId,
          integration
        );
        await this._integrationRepository.refreshNeeded(
          integration.organizationId,
          integration.id
        );
        // One channel that cannot refresh must not stop the ones after it.
        // This was a `return`, so a single revoked token ended the whole pass
        // and every channel behind it was left to expire.
        continue;
      }

      const { refreshToken, accessToken, expiresIn } = data;

      await this.createOrUpdateIntegration(
        undefined,
        !!provider.oneTimeToken,
        integration.organizationId,
        integration.name,
        undefined,
        'social',
        integration.internalId,
        integration.providerIdentifier,
        accessToken,
        refreshToken,
        expiresIn
      );
    }
  }

  /**
   * Providers a trialing organization cannot connect yet.
   *
   * Reads `trialLocked` off the provider rather than testing an identifier, so
   * a second provider joining the rule is one field on that provider and no
   * change here — the same reason `category` lives there.
   *
   * Three ways out, all deliberate: billing off means self-hosted, where every
   * gate is open; an organization that is not trialing was never locked; and a
   * refresh is an *existing* channel reconnecting, which must keep working —
   * cutting off a channel someone already publishes through would punish the
   * wrong person.
   *
   * 406 is the status the rest of the app already uses for "this is blocked
   * *because* you are on trial" — `media.service.ts:99` throws it for
   * trial-locked video. The frontend has a handler for exactly that code
   * (`layout.context.tsx:91`): it opens a dialog offering to finish the trial
   * and charge now, which is the way out this lock is supposed to point at.
   * Thrown as a plain Error it became a 500 and the message never arrived.
   */
  assertConnectAllowed(
    provider: { trialLocked?: boolean; name: string },
    org: { isTrailing?: boolean },
    refresh?: string
  ) {
    if (!isBillingEnabled() || !provider.trialLocked) {
      return;
    }
    if (!org?.isTrailing || refresh) {
      return;
    }

    throw new HttpException(
      `${provider.name} unlocks when your free trial ends. End the trial to connect it now.`,
      406
    );
  }

  async disableChannel(org: string, id: string) {
    return this._integrationRepository.disableChannel(org, id);
  }

  async enableChannel(org: string, totalChannels: number, id: string) {
    const integrations = (
      await this._integrationRepository.getIntegrationsList(org)
    ).filter((f) => !f.disabled);
    if (
      isBillingEnabled() &&
      integrations.length >= totalChannels
    ) {
      throw new Error('You have reached the maximum number of channels');
    }

    return this._integrationRepository.enableChannel(org, id);
  }

  async getPostsForChannel(org: string, id: string) {
    return this._integrationRepository.getPostsForChannel(org, id);
  }

  async deleteChannel(org: string, id: string) {
    return this._integrationRepository.deleteChannel(org, id);
  }

  async disableIntegrations(org: string, totalChannels: number) {
    const disabled = await this._integrationRepository.disableIntegrations(
      org,
      totalChannels
    );

    // A downgrade used to switch channels off in silence: the first the user
    // heard of it was their posts failing with "Channel disabled" on channels
    // they never touched. Notified here so both callers in subscription.service
    // are covered.
    // Wrapped: the non-digest notification path has no error handling of its
    // own, and both callers run inside the Stripe webhook. A throw here made
    // modifySubscription bail before the subscription row was written (the
    // customer pays, the plan never changes) and made deleteSubscription answer
    // 500. The channels are already off; the email is not worth that.
    if (disabled.length) {
      try {
        const names = disabled.map((c) => c.name).join(', ');
        await this._notificationService.inAppNotification(
          org,
          `${disabled.length} channel${
            disabled.length > 1 ? 's were' : ' was'
          } switched off`,
          `Your plan now allows fewer channels, so ${names} ${
            disabled.length > 1 ? 'were' : 'was'
          } switched off and will not publish. Upgrade, or remove another channel, to turn ${
            disabled.length > 1 ? 'them' : 'it'
          } back on.`,
          true,
          false,
          'info',
          '/billing'
        );
      } catch (err) {
        console.error(`[integrations] downgrade notice failed for ${org}`, err);
      }
    }

    return disabled;
  }

  // Mirror of the above. `disableIntegrations` had no counterpart, so a customer
  // who downgraded and later came back found their channels still off and had to
  // switch each one on by hand — while team members, whose disable/enable pair is
  // right above the channel branch in subscription.service, came back on their
  // own. Only channels this system switched off are returned; see the comment on
  // `autoDisabledAt` in the schema.
  async enableAutoDisabledIntegrations(org: string, headroom: number) {
    const enabled =
      await this._integrationRepository.enableAutoDisabledIntegrations(
        org,
        headroom
      );

    // Same wrapping rationale as the downgrade notice: this runs inside the
    // Stripe webhook, and the channels are already back regardless.
    if (enabled.length) {
      try {
        const names = enabled.map((c) => c.name).join(', ');
        await this._notificationService.inAppNotification(
          org,
          `${enabled.length} channel${
            enabled.length > 1 ? 's are' : ' is'
          } back on`,
          `Your plan allows more channels again, so ${names} ${
            enabled.length > 1 ? 'were' : 'was'
          } switched back on and can publish.`,
          true,
          false,
          'info',
          '/channels'
        );
      } catch (err) {
        console.error(`[integrations] upgrade notice failed for ${org}`, err);
      }
    }

    return enabled;
  }

  async checkForDeletedOnceAndUpdate(org: string, page: string) {
    return this._integrationRepository.checkForDeletedOnceAndUpdate(org, page);
  }

  async saveProviderPage(org: string, id: string, data: any) {
    const getIntegration = await this._integrationRepository.getIntegrationById(
      org,
      id
    );
    if (!getIntegration) {
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
    }
    if (!getIntegration.inBetweenSteps) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const provider = this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier
    );

    if (!provider.fetchPageInformation) {
      throw new HttpException(
        'Provider does not support page selection',
        HttpStatus.BAD_REQUEST
      );
    }

    const selections = providerPageSelections(data);
    if (!selections.length) {
      throw new HttpException(
        'Select at least one page or account to connect.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Resolve every page against the *user* token first. The first save
    // replaces that token with a page token, which cannot fetch siblings.
    const pages = [];
    for (const selection of selections) {
      let getIntegrationInformation;
      try {
        getIntegrationInformation = await provider.fetchPageInformation(
          getIntegration.token,
          selection
        );
      } catch (err) {
        if (err instanceof HttpException) {
          throw err;
        }
        throw new HttpException(
          (err as Error)?.message ||
            'Could not finish connecting this channel. Please try again.',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!getIntegrationInformation?.id) {
        throw new HttpException(
          'The provider did not return a channel to connect.',
          HttpStatus.BAD_REQUEST
        );
      }
      pages.push(getIntegrationInformation);
    }

    const ids: string[] = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      await this.checkForDeletedOnceAndUpdate(org, String(page.id));

      if (i === 0) {
        const updated = await this._integrationRepository.updateIntegration(
          id,
          {
            picture: page.picture,
            internalId: String(page.id),
            organizationId: org,
            name: page.name,
            inBetweenSteps: false,
            token: page.access_token,
            profile: page.username,
          }
        );
        ids.push(updated.id);
        continue;
      }

      const extra = await this._integrationRepository.createExtraProviderPage(
        getIntegration,
        {
          name: page.name,
          picture: page.picture,
          internalId: String(page.id),
          token: page.access_token,
          username: page.username,
        }
      );
      ids.push(extra.id);
    }

    return { success: true, id: ids[ids.length - 1], ids };
  }

  async checkAnalytics(
    org: Organization,
    integration: string,
    date: string,
    forceRefresh = false
  ): Promise<AnalyticsData[]> {
    const getIntegration = await this.getIntegrationById(org.id, integration);

    if (!getIntegration) {
      throw new Error('Invalid integration');
    }

    if (getIntegration.type !== 'social') {
      return [];
    }

    const integrationProvider = this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier
    );

    if (
      dayjs(getIntegration?.tokenExpiration).isBefore(dayjs()) ||
      forceRefresh
    ) {
      const data = await this._refreshIntegrationService.refresh(
        getIntegration
      );
      if (!data) {
        throw new HttpException(
          'This channel needs to be refreshed',
          HttpStatus.BAD_REQUEST
        );
      }

      const { accessToken } = data;

      if (accessToken) {
        getIntegration.token = accessToken;

        if (integrationProvider.refreshWait) {
          await timer(10000);
        }
      } else {
        await this.disconnectChannel(org.id, getIntegration);
        throw new HttpException(
          'This channel needs to be refreshed',
          HttpStatus.BAD_REQUEST
        );
      }
    }

    const getIntegrationData = await ioRedis.get(
      `integration:${org.id}:${integration}:${date}`
    );
    if (getIntegrationData) {
      return JSON.parse(getIntegrationData);
    }

    if (integrationProvider.analytics) {
      try {
        const loadAnalytics = await integrationProvider.analytics(
          getIntegration.internalId,
          getIntegration.token,
          +date
        );
        await ioRedis.set(
          `integration:${org.id}:${integration}:${date}`,
          JSON.stringify(loadAnalytics),
          'EX',
          !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
            ? 1
            : 3600
        );
        return loadAnalytics;
      } catch (e) {
        if (e instanceof RefreshToken) {
          if (forceRefresh) {
            throw new HttpException(
              'This channel needs to be refreshed',
              HttpStatus.BAD_REQUEST
            );
          }
          return this.checkAnalytics(org, integration, date, true);
        }
        if (e instanceof NotEnoughScopes || e instanceof Disconnect) {
          throw new HttpException(
            'This channel needs to be refreshed',
            HttpStatus.BAD_REQUEST
          );
        }
        if (e instanceof HttpException) {
          throw e;
        }
        // Invalid metrics, missing `values`, a quiet Graph 100, a TypeError in
        // a mapper: none of those are a revoked token. The pane used to treat
        // every leftover as "reconnect", so Instagram/Facebook looked broken
        // while X (which already returned []) looked empty. Empty series is
        // the honest answer; only RefreshToken / scopes / disconnect ask for
        // a new login.
        Logger.warn(
          `Analytics fetch failed for ${getIntegration.providerIdentifier}: ${
            (e as Error)?.message || e
          }`
        );
        return [];
      }
    }

    return [];
  }

  customers(orgId: string) {
    return this._integrationRepository.customers(orgId);
  }

  getPlugsByIntegrationId(org: string, integrationId: string) {
    return this._integrationRepository.getPlugsByIntegrationId(
      org,
      integrationId
    );
  }

  async processInternalPlug(
    data: {
      post: string;
      originalIntegration: string;
      integration: string;
      plugName: string;
      orgId: string;
      delay: number;
      information: any;
    },
    forceRefresh = false
  ): Promise<any> {
    const originalIntegration =
      await this._integrationRepository.getIntegrationById(
        data.orgId,
        data.originalIntegration
      );

    const getIntegration = await this._integrationRepository.getIntegrationById(
      data.orgId,
      data.integration
    );

    if (!getIntegration || !originalIntegration) {
      return;
    }

    const getAllInternalPlugs = this._integrationManager
      .getInternalPlugs(getIntegration.providerIdentifier)
      .internalPlugs.find((p: any) => p.identifier === data.plugName);

    if (!getAllInternalPlugs) {
      return;
    }

    const getSocialIntegration = this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier
    );

    // @ts-ignore
    await getSocialIntegration?.[getAllInternalPlugs.methodName]?.(
      getIntegration,
      originalIntegration,
      data.post,
      data.information
    );

    return;
  }

  async processPlugs(data: {
    plugId: string;
    postId: string;
    delay: number;
    totalRuns: number;
    currentRun: number;
  }) {
    const getPlugById = await this._integrationRepository.getPlug(data.plugId);
    if (!getPlugById) {
      return true;
    }

    const integration = this._integrationManager.getSocialIntegration(
      getPlugById.integration.providerIdentifier
    );

    // @ts-ignore
    const process = await integration[getPlugById.plugFunction](
      getPlugById.integration,
      data.postId,
      JSON.parse(getPlugById.data).reduce((all: any, current: any) => {
        all[current.name] = current.value;
        return all;
      }, {})
    );

    if (process) {
      return true;
    }

    if (data.totalRuns === data.currentRun) {
      return true;
    }

    return false;
  }

  async createOrUpdatePlug(
    orgId: string,
    integrationId: string,
    body: PlugDto
  ) {
    const { activated } = await this._integrationRepository.createOrUpdatePlug(
      orgId,
      integrationId,
      body
    );

    return {
      activated,
    };
  }

  async changePlugActivation(orgId: string, plugId: string, status: boolean) {
    const { id, integrationId, plugFunction } =
      await this._integrationRepository.changePlugActivation(
        orgId,
        plugId,
        status
      );

    return { id };
  }

  async getPlugs(orgId: string, integrationId: string) {
    return this._integrationRepository.getPlugs(orgId, integrationId);
  }

  async loadExisingData(
    methodName: string,
    integrationId: string,
    id: string[]
  ) {
    const exisingData = await this._integrationRepository.loadExisingData(
      methodName,
      integrationId,
      id
    );
    const loadOnlyIds = exisingData.map((p) => p.value);
    return difference(id, loadOnlyIds);
  }

  async findFreeDateTime(
    orgId: string,
    integrationsId?: string
  ): Promise<number[]> {
    const findTimes = await this._integrationRepository.getPostingTimes(
      orgId,
      integrationsId
    );
    return uniq(
      findTimes.reduce((all: any, current: any) => {
        return [
          ...all,
          ...JSON.parse(current.postingTimes).map(
            (p: { time: number }) => p.time
          ),
        ];
      }, [] as number[])
    );
  }
}
