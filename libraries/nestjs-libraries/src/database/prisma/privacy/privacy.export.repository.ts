import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

// Explicit selections are intentional: adding a credential column must never
// add it to an export. No shared repository return shape is changed here.
const personPictureSelect = {
  id: true,
  path: true,
  originalName: true,
  alt: true,
} satisfies Prisma.MediaSelect;

const personProfileSelect = {
  id: true,
  email: true,
  name: true,
  lastName: true,
  bio: true,
  providerName: true,
  providerId: true,
  audience: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  activated: true,
  lastOnline: true,
  ip: true,
  agent: true,
  lastReadNotifications: true,
  sendSuccessEmails: true,
  sendFailureEmails: true,
  sendStreakEmails: true,
  picture: { select: personPictureSelect },
} satisfies Prisma.UserSelect;
const mediaSelect = {
  id: true,
  name: true,
  originalName: true,
  path: true,
  fileSize: true,
  type: true,
  thumbnail: true,
  alt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.MediaSelect;
const commentSelect = {
  id: true,
  content: true,
  organizationId: true,
  postId: true,
  userId: true,
  displayName: true,
  parentId: true,
  anchorStart: true,
  anchorEnd: true,
  anchorQuote: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.CommentsSelect;

const personOrganizationsSelect = {
  organizationId: true,
  role: true,
  disabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserOrganizationSelect;

const personItemsSelect = {
  id: true,
  key: true,
} satisfies Prisma.ItemUserSelect;

const personAgenciesNichesSelect = {
  niche: true,
} satisfies Prisma.SocialMediaAgencyNicheSelect;

const personAgenciesSelect = {
  id: true,
  name: true,
  website: true,
  slug: true,
  facebook: true,
  instagram: true,
  twitter: true,
  linkedIn: true,
  youtube: true,
  tiktok: true,
  otherSocialMedia: true,
  shortDescription: true,
  description: true,
  approved: true,
  createdAt: true,
  updatedAt: true,
  logo: {
    select: mediaSelect,
  },
  niches: {
    take: 1001,
    select: personAgenciesNichesSelect,
    orderBy: { niche: 'asc' },
  },
} satisfies Prisma.SocialMediaAgencySelect;

const personPayoutProblemsSelect = {
  id: true,
  status: true,
  orderId: true,
  postId: true,
  amount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PayoutProblemsSelect;

const personOauthAuthorizationsSelect = {
  id: true,
  oauthAppId: true,
  organizationId: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OAuthAuthorizationSelect;

const personSelect = {
  ...personProfileSelect,
  organizations: {
    take: 1001,
    select: personOrganizationsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  comments: {
    take: 1001,
    select: commentSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  items: {
    take: 1001,
    select: personItemsSelect,
    orderBy: { id: 'asc' },
  },
  agencies: {
    select: personAgenciesSelect,
  },
  payoutProblems: {
    take: 1001,
    select: personPayoutProblemsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  oauthAuthorizations: {
    take: 1001,
    select: personOauthAuthorizationsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.UserSelect;

const personMessagesSelect = {
  id: true,
  groupId: true,
  from: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.MessagesSelect;

const personOrdersOrdersItemsSelect = {
  id: true,
  integrationId: true,
  quantity: true,
  price: true,
} satisfies Prisma.OrderItemsSelect;

const personOrdersSelect = {
  id: true,
  buyerId: true,
  sellerId: true,
  status: true,
  messageGroupId: true,
  createdAt: true,
  updatedAt: true,
  ordersItems: {
    take: 1001,
    select: personOrdersOrdersItemsSelect,
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.OrdersSelect;

const workspaceUsersSelect = {
  userId: true,
  role: true,
  disabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserOrganizationSelect;

const workspacePostTagsSelect = {
  tagId: true,
  createdAt: true,
} satisfies Prisma.TagsPostsSelect;

const workspacePostSelect = {
  id: true,
  state: true,
  publishDate: true,
  integrationId: true,
  content: true,
  delay: true,
  group: true,
  title: true,
  description: true,
  parentPostId: true,
  releaseId: true,
  releaseURL: true,
  image: true,
  creationMethod: true,
  intervalInDays: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  tags: {
    take: 1001,
    select: workspacePostTagsSelect,
    orderBy: [{ createdAt: 'asc' }, { tagId: 'asc' }],
  },
} satisfies Prisma.PostSelect;

const workspaceIntegrationSelect = {
  id: true,
  internalId: true,
  name: true,
  picture: true,
  providerIdentifier: true,
  type: true,
  disabled: true,
  profile: true,
  postingTimes: true,
  customerId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.IntegrationSelect;

const workspaceTagsSelect = {
  id: true,
  name: true,
  color: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.TagsSelect;

const workspaceNotificationsSelect = {
  id: true,
  content: true,
  link: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.NotificationsSelect;

const workspaceSignaturesSelect = {
  id: true,
  content: true,
  autoAdd: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.SignaturesSelect;

const workspaceSetsSelect = {
  id: true,
  name: true,
  content: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SetsSelect;

const workspaceCustomersSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.CustomerSelect;

const workspaceCreditsSelect = {
  id: true,
  credits: true,
  type: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CreditsSelect;

const workspaceSubscriptionSelect = {
  id: true,
  subscriptionTier: true,
  provider: true,
  period: true,
  totalChannels: true,
  isLifetime: true,
  cancelAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.SubscriptionSelect;

const workspaceClippingsClipsSelect = {
  id: true,
  title: true,
  content: true,
  start: true,
  end: true,
  trimStart: true,
  status: true,
  mediaId: true,
  path: true,
  thumbnail: true,
  draftedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClippingClipSelect;

const workspaceClippingsSelect = {
  id: true,
  title: true,
  status: true,
  duration: true,
  maxClips: true,
  fit: true,
  integrations: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  clips: {
    take: 1001,
    select: workspaceClippingsClipsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ClippingSelect;

const workspaceGithubSelect = {
  id: true,
  login: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GitHubSelect;

const workspaceThirdPartySelect = {
  id: true,
  identifier: true,
  name: true,
  internalId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ThirdPartySelect;

const workspaceOauthAppSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.OAuthAppSelect;

const workspaceOauthAuthorizationsSelect = {
  id: true,
  userId: true,
  oauthAppId: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OAuthAuthorizationSelect;

const workspaceSelect = {
  id: true,
  name: true,
  description: true,
  shortlink: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  streakSince: true,
  users: {
    take: 1001,
    select: workspaceUsersSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  post: {
    take: 1001,
    select: workspacePostSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  media: {
    take: 1001,
    select: mediaSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  Integration: {
    take: 1001,
    select: workspaceIntegrationSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  Comments: {
    take: 1001,
    select: commentSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  tags: {
    take: 1001,
    select: workspaceTagsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  notifications: {
    take: 1001,
    select: workspaceNotificationsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  signatures: {
    take: 1001,
    select: workspaceSignaturesSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  sets: {
    take: 1001,
    select: workspaceSetsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  customers: {
    take: 1001,
    select: workspaceCustomersSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  credits: {
    take: 1001,
    select: workspaceCreditsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  subscription: {
    select: workspaceSubscriptionSelect,
  },
  clippings: {
    take: 1001,
    select: workspaceClippingsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  github: {
    take: 1001,
    select: workspaceGithubSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  thirdParty: {
    take: 1001,
    select: workspaceThirdPartySelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  oauthApp: {
    take: 1001,
    select: workspaceOauthAppSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  oauthAuthorizations: {
    take: 1001,
    select: workspaceOauthAuthorizationsSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.OrganizationSelect;

const { niches: _niches, ...personAgencyFlatSelect } = personAgenciesSelect;
const { ordersItems: _items, ...personOrderFlatSelect } = personOrdersSelect;
const { tags: _tags, ...workspacePostFlatSelect } = workspacePostSelect;
const { clips: _clips, ...workspaceClippingFlatSelect } =
  workspaceClippingsSelect;
const {
  users: _users,
  post: _posts,
  media: _media,
  Integration: _integration,
  Comments: _comments,
  tags: _workspaceTags,
  notifications: _notifications,
  signatures: _signatures,
  sets: _sets,
  customers: _customers,
  credits: _credits,
  clippings: _clippings,
  github: _github,
  thirdParty: _thirdParty,
  oauthApp: _oauthApp,
  oauthAuthorizations: _authorizations,
  ...workspaceRootSelect
} = workspaceSelect;

@Injectable()
export class PrivacyExportRepository {
  constructor(
    private _db: PrismaRepository<
      | '$transaction'
      | 'user'
      | 'organization'
      | 'comments'
      | 'messages'
      | 'orders'
      | 'payoutProblems'
      | 'oAuthAuthorization'
      | 'socialMediaAgency'
    >
  ) {}

  private person(id: string, tx: Prisma.TransactionClient) {
    return tx.user.findUnique({
      where: {
        id,
      },
      select: personSelect,
    });
  }

  personMessages(
    id: string,
    tx: Pick<Prisma.TransactionClient, 'messages'> = this._db.model
  ) {
    return tx.messages.findMany({
      take: 1001,
      where: {
        group: {
          OR: [{ buyerId: id }, { sellerId: id }],
        },
      },
      select: personMessagesSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  private personOrders(id: string, tx: Prisma.TransactionClient) {
    return tx.orders.findMany({
      take: 1001,
      where: {
        OR: [{ buyerId: id }, { sellerId: id }],
      },
      select: personOrdersSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  // Counts and contents must share a snapshot: writes between preflight and
  // retrieval must not expand the graph after it has passed the row budget.
  snapshot(target: 'person' | 'workspace', id: string) {
    return this._db.model.$transaction(
      async (tx) => {
        if (target === 'workspace') {
          const root = await tx.organization.findUnique({
            where: { id },
            select: {
              _count: {
                select: {
                  users: true,
                  post: true,
                  media: true,
                  Integration: true,
                  Comments: true,
                  tags: true,
                  notifications: true,
                  signatures: true,
                  sets: true,
                  customers: true,
                  credits: true,
                  clippings: true,
                  github: true,
                  thirdParty: true,
                  oauthApp: true,
                  oauthAuthorizations: true,
                },
              },
            },
          });
          if (!root) return null;
          this.checkCounts(root._count);
          const [postTags, clips] = await Promise.all([
            tx.tagsPosts.count({ where: { post: { organizationId: id } } }),
            tx.clippingClip.count({
              where: { clipping: { organizationId: id } },
            }),
          ]);
          const [largePost, largeClipping] = await Promise.all([
            tx.tagsPosts.groupBy({
              by: ['postId'],
              where: { post: { organizationId: id } },
              having: { tagId: { _count: { gt: 1000 } } },
              orderBy: { postId: 'asc' },
              take: 1,
            }),
            tx.clippingClip.groupBy({
              by: ['clippingId'],
              where: { clipping: { organizationId: id } },
              having: { id: { _count: { gt: 1000 } } },
              orderBy: { clippingId: 'asc' },
              take: 1,
            }),
          ]);
          this.checkCounts({
            postTags: largePost.length ? 1001 : 0,
            clips: largeClipping.length ? 1001 : 0,
          });
          this.checkBudget([...Object.values(root._count), postTags, clips], 2);
          return tx.organization.findUnique({
            where: { id },
            select: workspaceSelect,
          });
        }

        const root = await tx.user.findUnique({
          where: { id },
          select: {
            _count: {
              select: {
                organizations: true,
                comments: true,
                items: true,
                payoutProblems: true,
                oauthAuthorizations: true,
              },
            },
            agencies: { select: { _count: { select: { niches: true } } } },
          },
        });
        if (!root) return null;
        const participant = { OR: [{ buyerId: id }, { sellerId: id }] };
        const [messages, orders, orderItems] = await Promise.all([
          tx.messages.count({ where: { group: participant } }),
          tx.orders.count({ where: participant }),
          tx.orderItems.count({ where: { order: participant } }),
        ]);
        const counts = {
          ...root._count,
          niches: root.agencies?._count.niches ?? 0,
          messages,
          orders,
        };
        this.checkCounts(counts);
        const largeOrder = await tx.orderItems.groupBy({
          by: ['orderId'],
          where: { order: participant },
          having: { id: { _count: { gt: 1000 } } },
          orderBy: { orderId: 'asc' },
          take: 1,
        });
        this.checkCounts({ orderItems: largeOrder.length ? 1001 : 0 });
        // Four covers the user, profile picture, agency and agency logo.
        this.checkBudget([...Object.values(counts), orderItems], 4);
        const person = await this.person(id, tx);
        const correspondence = await this.personMessages(id, tx);
        const purchases = await this.personOrders(id, tx);
        return { person, messages: correspondence, orders: purchases };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );
  }

  async stream(
    target: 'person' | 'workspace',
    id: string,
    begin: () => Promise<void>,
    emit: (category: string, value: unknown) => Promise<void>
  ) {
    return this._db.model.$transaction(
      async (tx) => {
        const root =
          target === 'person'
            ? await tx.user.findUnique({
                where: { id },
                select: personProfileSelect,
              })
            : await tx.organization.findUnique({
                where: { id },
                select: workspaceRootSelect,
              });
        if (!root) return false;
        await begin();
        await emit(target, root);
        const page = async <T extends { id: string }>(
          category: string,
          query: (after: string | undefined) => Promise<T[]>,
          keepId = true
        ) => {
          let after: string | undefined;
          for (;;) {
            const rows = await query(after);
            if (!rows.length) break;
            for (const row of rows) {
              if (keepId) await emit(category, row);
              else {
                const { id: _id, ...value } = row;
                await emit(category, value);
              }
            }
            after = rows[rows.length - 1].id;
            if (rows.length < 100) break;
          }
        };
        const participant = { OR: [{ buyerId: id }, { sellerId: id }] };
        if (target === 'person') {
          await page(
            'person.organizations',
            (after) =>
              tx.userOrganization.findMany({
                where: {
                  ...{ userId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...personOrganizationsSelect },
              }),
            false
          );
          await page(
            'person.comments',
            (after) =>
              tx.comments.findMany({
                where: {
                  ...{ userId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...commentSelect },
              }),
            true
          );
          await page(
            'person.items',
            (after) =>
              tx.itemUser.findMany({
                where: {
                  ...{ userId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...personItemsSelect },
              }),
            true
          );
          await page(
            'person.agencies',
            (after) =>
              tx.socialMediaAgency.findMany({
                where: {
                  ...{ userId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...personAgencyFlatSelect },
              }),
            true
          );
          await page(
            'person.payoutProblems',
            (after) =>
              tx.payoutProblems.findMany({
                where: {
                  ...{ userId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...personPayoutProblemsSelect },
              }),
            true
          );
          await page(
            'person.oauthAuthorizations',
            (after) =>
              tx.oAuthAuthorization.findMany({
                where: {
                  ...{ userId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...personOauthAuthorizationsSelect },
              }),
            true
          );
          await page(
            'person.messages',
            (after) =>
              tx.messages.findMany({
                where: {
                  ...{ group: participant },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...personMessagesSelect },
              }),
            true
          );
          await page(
            'person.orders',
            (after) =>
              tx.orders.findMany({
                where: {
                  ...participant,
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...personOrderFlatSelect },
              }),
            true
          );
          await page(
            'person.orderItems',
            (after) =>
              tx.orderItems.findMany({
                where: {
                  ...{ order: participant },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: {
                  id: true,
                  ...{ orderId: true, ...personOrdersOrdersItemsSelect },
                },
              }),
            true
          );
          let niche: string | undefined;
          for (;;) {
            const rows = await tx.socialMediaAgencyNiche.findMany({
              where: {
                agency: { userId: id },
                ...(niche ? { niche: { gt: niche } } : {}),
              },
              take: 100,
              orderBy: { niche: 'asc' },
              select: personAgenciesNichesSelect,
            });
            if (!rows.length) break;
            for (const row of rows) await emit('person.agencyNiches', row);
            niche = rows[rows.length - 1].niche;
            if (rows.length < 100) break;
          }
        } else {
          await page(
            'workspace.users',
            (after) =>
              tx.userOrganization.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceUsersSelect },
              }),
            false
          );
          await page(
            'workspace.post',
            (after) =>
              tx.post.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspacePostFlatSelect },
              }),
            true
          );
          await page(
            'workspace.media',
            (after) =>
              tx.media.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...mediaSelect },
              }),
            true
          );
          await page(
            'workspace.Integration',
            (after) =>
              tx.integration.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceIntegrationSelect },
              }),
            true
          );
          await page(
            'workspace.Comments',
            (after) =>
              tx.comments.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...commentSelect },
              }),
            true
          );
          await page(
            'workspace.tags',
            (after) =>
              tx.tags.findMany({
                where: {
                  ...{ orgId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceTagsSelect },
              }),
            true
          );
          await page(
            'workspace.notifications',
            (after) =>
              tx.notifications.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceNotificationsSelect },
              }),
            true
          );
          await page(
            'workspace.signatures',
            (after) =>
              tx.signatures.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceSignaturesSelect },
              }),
            true
          );
          await page(
            'workspace.sets',
            (after) =>
              tx.sets.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceSetsSelect },
              }),
            true
          );
          await page(
            'workspace.customers',
            (after) =>
              tx.customer.findMany({
                where: {
                  ...{ orgId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceCustomersSelect },
              }),
            true
          );
          await page(
            'workspace.credits',
            (after) =>
              tx.credits.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceCreditsSelect },
              }),
            true
          );
          await page(
            'workspace.clippings',
            (after) =>
              tx.clipping.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceClippingFlatSelect },
              }),
            true
          );
          await page(
            'workspace.github',
            (after) =>
              tx.gitHub.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceGithubSelect },
              }),
            true
          );
          await page(
            'workspace.thirdParty',
            (after) =>
              tx.thirdParty.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceThirdPartySelect },
              }),
            true
          );
          await page(
            'workspace.oauthApp',
            (after) =>
              tx.oAuthApp.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceOauthAppSelect },
              }),
            true
          );
          await page(
            'workspace.oauthAuthorizations',
            (after) =>
              tx.oAuthAuthorization.findMany({
                where: {
                  ...{ organizationId: id },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: { id: true, ...workspaceOauthAuthorizationsSelect },
              }),
            true
          );
          await page(
            'workspace.clips',
            (after) =>
              tx.clippingClip.findMany({
                where: {
                  ...{ clipping: { organizationId: id } },
                  ...(after ? { id: { gt: after } } : {}),
                },
                take: 100,
                orderBy: { id: 'asc' },
                select: {
                  id: true,
                  ...{ clippingId: true, ...workspaceClippingsClipsSelect },
                },
              }),
            true
          );
          let last: { postId: string; tagId: string } | undefined;
          for (;;) {
            const rows = await tx.tagsPosts.findMany({
              where: {
                post: { organizationId: id },
                ...(last
                  ? {
                      OR: [
                        { postId: { gt: last.postId } },
                        { postId: last.postId, tagId: { gt: last.tagId } },
                      ],
                    }
                  : {}),
              },
              take: 100,
              orderBy: [{ postId: 'asc' }, { tagId: 'asc' }],
              select: { postId: true, ...workspacePostTagsSelect },
            });
            if (!rows.length) break;
            for (const row of rows) await emit('workspace.postTags', row);
            last = rows[rows.length - 1];
            if (rows.length < 100) break;
          }
        }
        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 15 * 60_000,
      }
    );
  }

  private checkCounts(counts: Record<string, number>) {
    for (const [category, count] of Object.entries(counts)) {
      if (count > 1000) {
        throw new PayloadTooLargeException(
          `Data category ${category} exceeds 1,000 records. Request a complete manual controller export.`
        );
      }
    }
  }

  private checkBudget(counts: number[], singleRecords: number) {
    // Include nested join rows, rather than applying 1,001 independently to
    // every parent and potentially loading millions of child rows.
    if (
      counts.reduce((total, count) => total + count, singleRecords) > 10_000
    ) {
      throw new PayloadTooLargeException(
        'This export exceeds 10,000 total records including nested relations. Request a complete manual controller export.'
      );
    }
  }
}
