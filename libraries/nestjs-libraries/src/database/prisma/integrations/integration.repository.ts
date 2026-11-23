import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import dayjs from 'dayjs';
import { Integration, Prisma } from '@prisma/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { IntegrationTimeDto } from '@gitroom/nestjs-libraries/dtos/integrations/integration.time.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { PlugDto } from '@gitroom/nestjs-libraries/dtos/plugs/plug.dto';
import {
  ENCRYPTED_PREFIX,
  EncryptionService,
  integrationEncryptedFields,
} from '@gitroom/nestjs-libraries/services/encryption.service';

@Injectable()
export class IntegrationRepository {
  private storage = UploadFactory.createStorage();
  constructor(
    private _integration: PrismaRepository<'integration'>,
    private _posts: PrismaRepository<'post'>,
    private _plugs: PrismaRepository<'plugs'>,
    private _exisingPlugData: PrismaRepository<'exisingPlugData'>,
    private _customers: PrismaRepository<'customer'>,
    private _mentions: PrismaRepository<'mentions'>,
    private _encryptionService: EncryptionService
  ) {}

  private async decryptTokens<T extends Partial<Integration>>(
    integration: T | null
  ) {
    return integration
      ? this._encryptionService.decryptFields(
          integration,
          integrationEncryptedFields
        )
      : integration;
  }

  getMentions(platform: string, q: string) {
    return this._mentions.model.mentions.findMany({
      where: {
        platform,
        OR: [
          {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            username: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: {
        name: 'asc',
      },
      take: 100,
      select: {
        name: true,
        username: true,
        image: true,
      },
    });
  }

  insertMentions(
    platform: string,
    mentions: { name: string; username: string; image: string }[]
  ) {
    if (mentions.length === 0) {
      return [] as any[];
    }
    return this._mentions.model.mentions.createMany({
      data: mentions.map((mention) => ({
        platform,
        name: mention.name,
        username: mention.username,
        image: mention.image,
      })),
      skipDuplicates: true,
    });
  }

  async checkPreviousConnections(org: string, id: string) {
    // Deleted accounts keep their integrations with an md5 hashed
    // rootInternalId, so match both the raw id and its hash to still catch
    // channels that were connected by a deleted account.
    const findIt = await this._integration.model.integration.findMany({
      where: {
        rootInternalId: {
          in: [id, createHash('md5').update(id).digest('hex')],
        },
      },
      select: {
        organizationId: true,
        id: true,
      },
    });

    if (findIt.some((f) => f.organizationId === org)) {
      return false;
    }

    return findIt.length > 0;
  }

  updateProviderSettings(org: string, id: string, settings: string) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: {
        additionalSettings: settings,
      },
    });
  }

  updateCustomName(org: string, id: string, name: string) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: {
        customName: name.trim() || null,
      },
    });
  }

  async setTimes(org: string, id: string, times: IntegrationTimeDto) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: {
        postingTimes: JSON.stringify(times.time),
      },
    });
  }

  async getPlug(plugId: string) {
    const plug = await this._plugs.model.plugs.findFirst({
      where: {
        id: plugId,
      },
      include: {
        integration: true,
      },
    });

    return plug
      ? { ...plug, integration: await this.decryptTokens(plug.integration) }
      : plug;
  }

  async getPlugs(orgId: string, integrationId: string) {
    return this._plugs.model.plugs.findMany({
      where: {
        integrationId,
        organizationId: orgId,
        activated: true,
      },
      include: {
        integration: {
          select: {
            id: true,
            providerIdentifier: true,
          },
        },
      },
    });
  }

  // `read` is the channel as it was when the page was picked: the page lookup
  // runs in between, and a channel that became another one meanwhile (another
  // provider, another id) must not get the picked page and its token
  async updateIntegration(
    id: string,
    params: Partial<Integration>,
    read: Pick<Integration, 'providerIdentifier' | 'internalId'>
  ) {
    if (
      params.picture &&
      (params.picture.indexOf(process.env.CLOUDFLARE_BUCKET_URL!) === -1 ||
        params.picture.indexOf(process.env.FRONTEND_URL!) === -1)
    ) {
      params.picture = await this.storage.uploadSimple(params.picture);
    }

    const stillPicked = {
      id,
      providerIdentifier: read.providerIdentifier,
      internalId: read.internalId,
    };

    const picked = await this._integration.model.integration.findFirst({
      where: stillPicked,
      select: {
        providerIdentifier: true,
        rootInternalId: true,
        refreshToken: true,
        tokenExpiration: true,
      },
    });

    if (!picked) {
      return null;
    }

    // Only a channel of the same provider is taken over. Another provider's
    // row with this id (whose id can be anything its server answers) would
    // keep its provider and get this login's tokens and identity; it is left
    // alone, and the update below then fails on the unique id instead.
    const existing = await this._integration.model.integration.findFirst({
      where: {
        organizationId: params.organizationId!,
        internalId: params.internalId,
        providerIdentifier: picked.providerIdentifier,
      },
    });

    // The page was picked through a fresh login: the row that keeps living
    // must also take that login's identity and refresh token, otherwise the
    // next refresh runs as the old identity and cannot find the page.
    const fresh = existing ? picked : null;

    if (existing) {
      const { count } = await this._integration.model.integration.updateMany({
        where: stillPicked,
        data: {
          internalId: `deleted_${params.internalId}_${makeId(10)}`,
          deletedAt: new Date(),
        },
      });

      if (!count) {
        return null;
      }

      await this._posts.model.post.updateMany({
        where: {
          integrationId: id,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    const { count } = await this._integration.model.integration.updateMany({
      where: existing
        ? { id: existing.id, providerIdentifier: picked.providerIdentifier }
        : stillPicked,
      data: {
        ...(await this._encryptionService.encryptFields(
          params,
          integrationEncryptedFields
        )),
        ...(fresh?.rootInternalId
          ? { rootInternalId: fresh.rootInternalId }
          : {}),
        // copied the way it is stored, and with the root even when empty: the
        // previous login's refresh token must not stay under the new root
        ...(fresh?.refreshToken || fresh?.rootInternalId
          ? { refreshToken: fresh.refreshToken }
          : {}),
        ...(fresh?.tokenExpiration
          ? { tokenExpiration: fresh.tokenExpiration }
          : {}),
        disabled: false,
        deletedAt: null,
        refreshNeeded: false,
      },
    });

    return count ? { id: existing ? existing.id : id } : null;
  }

  disconnectChannel(org: string, id: string) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: {
        refreshNeeded: true,
      },
    });
  }

  async getIntegrationByInternalId(org: string, internalId: string) {
    return this.decryptTokens(
      await this._integration.model.integration.findFirst({
        where: {
          organizationId: org,
          internalId,
          deletedAt: null,
        },
      })
    );
  }

  // Moves a channel to another provider in place (MIGRATE_PROVIDERS): only the
  // provider and the app-scoped ids change, so the integration id - and with it
  // scheduled posts, settings and customers - survives the migration. The
  // follow-up createOrUpdateIntegration upsert matches the new internalId and
  // stores the fresh tokens.
  async migrateIntegration(
    org: string,
    id: string,
    internalId: string,
    providerIdentifier: string,
    rootInternalId: string
  ) {
    // A soft-deleted channel can still hold the target internalId
    // (deleteChannel keeps it): rename it out of the way like updateIntegration
    // does, otherwise the organizationId_internalId unique constraint rejects
    // the migration. Live channels are rejected by the service before this.
    const existing = await this._integration.model.integration.findUnique({
      where: {
        organizationId_internalId: {
          organizationId: org,
          internalId,
        },
      },
    });

    if (existing && existing.deletedAt) {
      await this._integration.model.integration.update({
        where: {
          id: existing.id,
        },
        data: {
          internalId: `deleted_${internalId}_${makeId(10)}`,
        },
      });
    }

    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: {
        internalId,
        providerIdentifier,
        rootInternalId,
      },
    });
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
    expiresIn = 999999999,
    username?: string,
    isBetweenSteps = false,
    refresh?: string,
    timezone?: number,
    customInstanceDetails?: string,
    rootInternalId?: string,
    expectedRootInternalId?: string | null
  ) {
    token = await this._encryptionService.encrypt(token);
    refreshToken = await this._encryptionService.encrypt(refreshToken);
    const postTimes = timezone
      ? {
          postingTimes: JSON.stringify([
            { time: 560 - timezone },
            { time: 850 - timezone },
            { time: 1140 - timezone },
          ]),
        }
      : {};

    // A connect that lands on another provider's channel with the same id
    // replaces it: it starts from its own id as root, and keeps no refresh
    // token of the previous provider's login
    const previous =
      expectedRootInternalId === undefined
        ? await this._integration.model.integration.findUnique({
            where: {
              organizationId_internalId: { organizationId: org, internalId },
            },
            select: { providerIdentifier: true, rootInternalId: true },
          })
        : null;
    const providerChanges =
      !!previous && previous.providerIdentifier !== provider;
    const movesTo =
      rootInternalId || (providerChanges ? internalId : undefined);
    const rootChanges =
      !!previous && !!movesTo && previous.rootInternalId !== movesTo;

    const update: Prisma.IntegrationUncheckedUpdateInput = {
      ...(additionalSettings
        ? { additionalSettings: JSON.stringify(additionalSettings) }
        : {}),
      ...(customInstanceDetails ? { customInstanceDetails } : {}),
      type: type as any,
      ...(!refresh
        ? {
            inBetweenSteps: isBetweenSteps,
          }
        : {}),
      ...(picture ? { picture } : {}),
      profile: username,
      providerIdentifier: provider,
      token,
      // never wipe a stored refresh token with an empty one, unless the
      // channel moves to another login: the previous login's refresh token
      // would keep renewing its tokens under the new login's root
      ...(refreshToken || rootChanges || providerChanges
        ? { refreshToken }
        : {}),
      ...(expiresIn
        ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
        : {}),
      internalId,
      organizationId: org,
      deletedAt: null,
      refreshNeeded: false,
      // a reconnect can be done with another login: the channel moves to
      // it, otherwise the oneTimeToken copy below would hand the new
      // tokens to every channel of the previous login, in any organization
      ...(movesTo ? { rootInternalId: movesTo } : {}),
    };

    const copyToSameLogin = async (
      rootId: string | null,
      except: Prisma.IntegrationWhereInput
    ) => {
      // a channel without a root doesn't say which login it is, falling back
      // to its own id would match other logins' channels that use it as root
      if (!rootId) {
        return;
      }

      await this._integration.model.integration.updateMany({
        where: {
          NOT: except,
          rootInternalId: rootId,
          // only the same provider's ids come from the same login: another
          // provider's id can be anything its server answers, and would get
          // these tokens just by matching the string
          providerIdentifier: provider,
          // a deleted channel must not keep receiving the login's tokens
          deletedAt: null,
        },
        data: {
          token,
          refreshToken,
          refreshNeeded: false,
          ...(expiresIn
            ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
            : {}),
        },
      });
    };

    // A token renewal is only stored while the channel still has the root it
    // was read with. A reconnect in between moved it to another login, whose
    // tokens must not be overwritten, nor copied over with the previous ones.
    // A renewal never brings a deleted channel back.
    if (expectedRootInternalId !== undefined) {
      const { count } = await this._integration.model.integration.updateMany({
        where: {
          organizationId: org,
          internalId,
          rootInternalId: expectedRootInternalId,
          deletedAt: null,
        },
        data: update,
      });

      if (count && oneTimeToken) {
        await copyToSameLogin(expectedRootInternalId, {
          organizationId: org,
          internalId,
        });
      }

      return this.decryptTokens(
        await this._integration.model.integration.findFirst({
          where: { organizationId: org, internalId },
        })
      );
    }

    const upsert = await this._integration.model.integration.upsert({
      where: {
        organizationId_internalId: {
          internalId,
          organizationId: org,
        },
      },
      create: {
        type: type as any,
        name,
        providerIdentifier: provider,
        token,
        profile: username,
        ...(picture ? { picture } : {}),
        inBetweenSteps: isBetweenSteps,
        refreshToken,
        ...(expiresIn
          ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
          : {}),
        internalId,
        ...postTimes,
        organizationId: org,
        refreshNeeded: false,
        // a reconnect of a channel the org doesn't have yet belongs to the
        // login, never to the page id that other organizations may share
        rootInternalId: rootInternalId || internalId,
        ...(customInstanceDetails ? { customInstanceDetails } : {}),
        additionalSettings: additionalSettings
          ? JSON.stringify(additionalSettings)
          : '[]',
      },
      update,
    });

    if (oneTimeToken) {
      // the root of the row just written: reading it back in a second query
      // could see a root a concurrent reconnect moved in between
      await copyToSameLogin(upsert.rootInternalId, {
        id: upsert.id,
      });
    }

    return this.decryptTokens(upsert);
  }

  async needsToBeRefreshed() {
    const integrations = await this._integration.model.integration.findMany({
      where: {
        tokenExpiration: {
          lte: dayjs().add(1, 'day').toDate(),
        },
        inBetweenSteps: false,
        deletedAt: null,
        refreshNeeded: false,
      },
    });

    return Promise.all(integrations.map((p) => this.decryptTokens(p)));
  }

  async setBetweenRefreshSteps(id: string) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
      },
      data: {
        inBetweenSteps: true,
      },
    });
  }
  // Only the attempt that flips the flag reports it, so parallel failed
  // refreshes of an already flagged channel do not notify again
  async refreshNeeded(org: string, id: string) {
    const { count } = await this._integration.model.integration.updateMany({
      where: {
        id,
        organizationId: org,
        refreshNeeded: false,
      },
      data: {
        refreshNeeded: true,
      },
    });

    return count === 1;
  }

  updateNameAndUrl(id: string, name: string, url: string) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
      },
      data: {
        ...(name ? { name } : {}),
        ...(url ? { picture: url } : {}),
      },
    });
  }

  async getIntegrationById(org: string, id: string) {
    return this.decryptTokens(
      await this._integration.model.integration.findFirst({
        where: {
          organizationId: org,
          id,
        },
      })
    );
  }

  async getIntegrationForOrder(
    id: string,
    order: string,
    user: string,
    org: string
  ) {
    const integration = await this._posts.model.post.findFirst({
      where: {
        integrationId: id,
        submittedForOrder: {
          id: order,
          messageGroup: {
            OR: [
              { sellerId: user },
              { buyerId: user },
              { buyerOrganizationId: org },
            ],
          },
        },
      },
      select: {
        integration: {
          select: {
            id: true,
            name: true,
            picture: true,
            inBetweenSteps: true,
            providerIdentifier: true,
          },
        },
      },
    });

    return integration?.integration;
  }

  async updateOnCustomerName(org: string, id: string, name: string) {
    const customer = !name
      ? undefined
      : (await this._customers.model.customer.findFirst({
          where: {
            orgId: org,
            name,
          },
        })) ||
        (await this._customers.model.customer.create({
          data: {
            name,
            orgId: org,
          },
        }));

    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: {
        customer: !customer
          ? { disconnect: true }
          : {
              connect: {
                id: customer.id,
              },
            },
      },
    });
  }

  updateIntegrationGroup(org: string, id: string, group: string) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: !group
        ? {
            customer: {
              disconnect: true,
            },
          }
        : {
            customer: {
              connect: {
                id: group,
              },
            },
          },
    });
  }

  getCustomerByName(orgId: string, name: string) {
    return this._customers.model.customer.findFirst({
      where: {
        orgId,
        name,
        deletedAt: null,
      },
    });
  }

  updateCustomerName(orgId: string, id: string, name: string) {
    return this._customers.model.customer.update({
      where: {
        id,
        orgId,
      },
      data: {
        name,
      },
    });
  }

  customers(orgId: string) {
    return this._customers.model.customer.findMany({
      where: {
        orgId,
        deletedAt: null,
      },
    });
  }

  // Without the tokens: nothing that lists the channels uses them, and a list
  // that never decrypts can never fail on a token (it is also read while a
  // payment webhook changes a subscription)
  getIntegrationsList(org: string) {
    return this._integration.model.integration.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
      },
      omit: {
        token: true,
        refreshToken: true,
      },
      include: {
        customer: true,
      },
    });
  }

  private async latestPostsFor(
    org: string,
    state: 'PUBLISHED' | 'ERROR',
    field: 'publishDate' | 'updatedAt',
    options: { topLevelOnly: boolean; includeDeleted: boolean },
    groups: { integrationId: string; date: Date | null }[]
  ) {
    const matches = groups.filter((group) => group.date);

    if (!matches.length) {
      return [];
    }

    return this._posts.model.post.findMany({
      where: {
        organizationId: org,
        state,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(options.topLevelOnly ? { parentPostId: null } : {}),
        OR: matches.map(
          (group) =>
            ({
              integrationId: group.integrationId,
              [field]: group.date,
            } as Prisma.PostWhereInput)
        ),
      },
      orderBy: {
        id: 'asc',
      },
      select: {
        id: true,
        integrationId: true,
        publishDate: true,
        updatedAt: true,
        releaseURL: true,
        error: true,
      },
    });
  }

  private firstPerIntegration<T extends { integrationId: string }>(posts: T[]) {
    const byIntegration = new Map<string, T>();

    for (const post of posts) {
      if (!byIntegration.has(post.integrationId)) {
        byIntegration.set(post.integrationId, post);
      }
    }

    return byIntegration;
  }

  async getChannelHealth(org: string, includeDeleted = false) {
    const [integrations, lastPublished, lastErrored] = await Promise.all([
      this._integration.model.integration.findMany({
        where: {
          organizationId: org,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          internalId: true,
          name: true,
          providerIdentifier: true,
          type: true,
          disabled: true,
          refreshNeeded: true,
          inBetweenSteps: true,
          tokenExpiration: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this._posts.model.post.groupBy({
        by: ['integrationId'],
        where: {
          organizationId: org,
          state: 'PUBLISHED',
          ...(includeDeleted ? {} : { deletedAt: null }),
          parentPostId: null,
        },
        _max: { publishDate: true },
      }),
      this._posts.model.post.groupBy({
        by: ['integrationId'],
        where: {
          organizationId: org,
          state: 'ERROR',
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        _max: { updatedAt: true },
      }),
    ]);

    const [publishedPosts, erroredPosts] = await Promise.all([
      this.latestPostsFor(
        org,
        'PUBLISHED',
        'publishDate',
        { topLevelOnly: true, includeDeleted },
        lastPublished.map((group) => ({
          integrationId: group.integrationId,
          date: group._max.publishDate,
        }))
      ),
      this.latestPostsFor(
        org,
        'ERROR',
        'updatedAt',
        { topLevelOnly: false, includeDeleted },
        lastErrored.map((group) => ({
          integrationId: group.integrationId,
          date: group._max.updatedAt,
        }))
      ),
    ]);

    const publishedByIntegration = this.firstPerIntegration(publishedPosts);
    const erroredByIntegration = this.firstPerIntegration(erroredPosts);

    return integrations.map((integration) => {
      const published = publishedByIntegration.get(integration.id);
      const errored = erroredByIntegration.get(integration.id);

      return {
        ...integration,
        lastPublishedAt: published?.publishDate || null,
        lastPublishedPostId: published?.id || null,
        lastPublishedUrl: published?.releaseURL || null,
        lastErrorAt: errored?.updatedAt || null,
        lastErrorPostId: errored?.id || null,
        lastError: errored?.error || null,
      };
    });
  }

  async disableChannel(org: string, id: string) {
    await this._integration.model.integration.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        disabled: true,
      },
    });
  }

  async enableChannel(org: string, id: string) {
    await this._integration.model.integration.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        disabled: false,
      },
    });
  }

  getPostsForChannel(org: string, id: string) {
    return this._posts.model.post.groupBy({
      by: ['group'],
      where: {
        organizationId: org,
        integrationId: id,
        deletedAt: null,
      },
    });
  }

  deleteChannel(org: string, id: string) {
    return this._integration.model.integration.update({
      select: {
        id: true,
      },
      where: {
        id,
        organizationId: org,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async deleteIntegrationsForAccount(org: string) {
    const hash = (value: string) =>
      createHash('md5').update(value).digest('hex');

    await this._posts.model.post.updateMany({
      where: {
        organizationId: org,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    const integrations = await this._integration.model.integration.findMany({
      where: {
        organizationId: org,
      },
    });

    // md5 is deterministic, so a hashed rootInternalId can still be matched
    // by checkPreviousConnections when the same channel is connected again
    // from a new account.
    for (const integration of integrations) {
      await this._integration.model.integration.update({
        where: {
          id: integration.id,
        },
        data: {
          name: hash(integration.name),
          internalId: hash(integration.internalId),
          rootInternalId: integration.rootInternalId
            ? hash(integration.rootInternalId)
            : null,
          token: hash(integration.token),
          refreshToken: integration.refreshToken
            ? hash(integration.refreshToken)
            : null,
          profile: integration.profile ? hash(integration.profile) : null,
          customInstanceDetails: integration.customInstanceDetails
            ? hash(integration.customInstanceDetails)
            : null,
          picture: null,
          deletedAt: integration.deletedAt || new Date(),
        },
      });
    }
  }

  async checkForDeletedOnceAndUpdate(org: string, page: string) {
    return this._integration.model.integration.updateMany({
      where: {
        organizationId: org,
        internalId: page,
        deletedAt: {
          not: null,
        },
      },
      data: {
        internalId: makeId(10),
      },
    });
  }

  async disableIntegrations(org: string, totalChannels: number) {
    const getChannels = await this._integration.model.integration.findMany({
      where: {
        organizationId: org,
        disabled: false,
        deletedAt: null,
      },
      take: totalChannels,
      select: {
        id: true,
      },
    });

    for (const channel of getChannels) {
      await this._integration.model.integration.update({
        where: {
          id: channel.id,
        },
        data: {
          disabled: true,
        },
      });
    }
  }

  enableAllIntegrations(org: string) {
    return this._integration.model.integration.updateMany({
      where: {
        organizationId: org,
        disabled: true,
        deletedAt: null,
      },
      data: {
        disabled: false,
      },
    });
  }

  getPlugsByIntegrationId(org: string, id: string) {
    return this._plugs.model.plugs.findMany({
      where: {
        organizationId: org,
        integrationId: id,
      },
    });
  }

  createOrUpdatePlug(org: string, integrationId: string, body: PlugDto) {
    return this._plugs.model.plugs.upsert({
      where: {
        organizationId: org,
        plugFunction_integrationId: {
          integrationId,
          plugFunction: body.func,
        },
      },
      create: {
        integrationId,
        organizationId: org,
        plugFunction: body.func,
        data: JSON.stringify(body.fields),
        activated: true,
      },
      update: {
        data: JSON.stringify(body.fields),
      },
      select: {
        activated: true,
      },
    });
  }

  changePlugActivation(orgId: string, plugId: string, status: boolean) {
    return this._plugs.model.plugs.update({
      where: {
        organizationId: orgId,
        id: plugId,
      },
      data: {
        activated: !!status,
      },
    });
  }

  async loadExisingData(
    methodName: string,
    integrationId: string,
    id: string[]
  ) {
    return this._exisingPlugData.model.exisingPlugData.findMany({
      where: {
        integrationId,
        methodName,
        value: {
          in: id,
        },
      },
    });
  }

  async saveExisingData(
    methodName: string,
    integrationId: string,
    value: string[]
  ) {
    return this._exisingPlugData.model.exisingPlugData.createMany({
      data: value.map((p) => ({
        integrationId,
        methodName,
        value: p,
      })),
    });
  }

  // A page of the channels that still have a token stored plain, for the
  // workflow that encrypts the tokens that were stored before the encryption
  getPlainTokens(afterId?: string) {
    return this._integration.model.integration.findMany({
      where: {
        ...(afterId ? { id: { gt: afterId } } : {}),
        OR: [
          {
            AND: [
              { token: { not: '' } },
              { token: { not: { startsWith: ENCRYPTED_PREFIX } } },
            ],
          },
          {
            AND: [
              { refreshToken: { not: '' } },
              { refreshToken: { not: { startsWith: ENCRYPTED_PREFIX } } },
            ],
          },
        ],
      },
      orderBy: {
        id: 'asc',
      },
      take: 500,
      select: {
        id: true,
        token: true,
        refreshToken: true,
        updatedAt: true,
      },
    });
  }

  // Stores the plain tokens of a channel encrypted. They are only stored when
  // they are still the tokens that were read, so a refresh that ran in between
  // is never overwritten, and the update date of the channel is kept.
  async encryptStoredTokens(
    integration: Pick<
      Integration,
      'id' | 'token' | 'refreshToken' | 'updatedAt'
    >
  ) {
    // one of the two can already be encrypted
    const encrypt = async (value: string | null) =>
      !value || this._encryptionService.isEncrypted(value)
        ? value
        : this._encryptionService.encrypt(value);

    const token = (await encrypt(integration.token))!;
    const refreshToken = await encrypt(integration.refreshToken);

    const { count } = await this._integration.model.integration.updateMany({
      where: {
        id: integration.id,
        token: integration.token,
        refreshToken: integration.refreshToken,
      },
      data: {
        token,
        refreshToken,
        updatedAt: integration.updatedAt,
      },
    });

    return count === 1;
  }

  async getPostingTimes(orgId: string, integrationsId?: string) {
    return this._integration.model.integration.findMany({
      where: {
        ...(integrationsId ? { id: integrationsId } : {}),
        organizationId: orgId,
        disabled: false,
        deletedAt: null,
      },
      select: {
        postingTimes: true,
      },
    });
  }
}
