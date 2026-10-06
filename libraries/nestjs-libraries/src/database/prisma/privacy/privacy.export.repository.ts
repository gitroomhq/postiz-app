import { Injectable } from '@nestjs/common';
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

@Injectable()
export class PrivacyExportRepository {
  constructor(
    private _db: PrismaRepository<
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

  person(id: string) {
    return this._db.model.user.findUnique({
      where: {
        id,
      },
      select: personSelect,
    });
  }

  personMessages(id: string) {
    return this._db.model.messages.findMany({
      take: 1001,
      where: {
        OR: [
          { from: 'BUYER', group: { buyerId: id } },
          { from: 'SELLER', group: { sellerId: id } },
        ],
      },
      select: personMessagesSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  personOrders(id: string) {
    return this._db.model.orders.findMany({
      take: 1001,
      where: {
        OR: [{ buyerId: id }, { sellerId: id }],
      },
      select: personOrdersSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  workspace(id: string) {
    return this._db.model.organization.findUnique({
      where: {
        id,
      },
      select: workspaceSelect,
    });
  }
}
