import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { LinkedinProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.provider';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { timer } from '@gitroom/helpers/utils/timer';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

@Rules(
  'LinkedIn can have maximum one attachment when selecting video, when choosing a carousel on LinkedIn minimum amount of attachment must be two, and only pictures, if uploading a video, LinkedIn can have only one attachment'
)
export class LinkedinPageProvider
  extends LinkedinProvider
  implements SocialProvider
{
  override identifier = 'linkedin-page';
  override name = 'LinkedIn Page';
  override isBetweenSteps = true;
  override refreshWait = true;
  override maxConcurrentJob = 2; // LinkedIn Page has professional posting limits
  override scopes = [
    'openid',
    'profile',
    'w_member_social',
    'r_basicprofile',
    'rw_organization_admin',
    'w_organization_social',
    'r_organization_social',
  ];

  override editor = 'normal' as const;

  override async refreshToken(
    refresh_token: string
  ): Promise<AuthTokenDetails> {
    const {
      access_token: accessToken,
      expires_in,
      refresh_token: refreshToken,
    } = await (
      await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      })
    ).json();

    const { vanityName } = await (
      await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const {
      name,
      sub: id,
      picture,
    } = await (
      await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      accessToken,
      refreshToken,
      expiresIn: expires_in,
      name,
      picture,
      username: vanityName,
    };
  }

  override async repostPostUsers(
    integration: Integration,
    originalIntegration: Integration,
    postId: string,
    information: any
  ) {
    return super.repostPostUsers(
      integration,
      originalIntegration,
      postId,
      information,
      false
    );
  }

  override async generateAuthUrl() {
    const state = makeId(6);
    const codeVerifier = makeId(30);
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&prompt=none&client_id=${
      process.env.LINKEDIN_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      `${process.env.FRONTEND_URL}/integrations/social/linkedin-page`
    )}&state=${state}&scope=${encodeURIComponent(this.scopes.join(' '))}`;
    return {
      url,
      codeVerifier,
      state,
    };
  }

  async companies(accessToken: string) {
    const { elements, ...all } = await (
      await fetch(
        'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName,vanityName,logoV2(original~:playableStreams))))',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202501',
          },
        }
      )
    ).json();

    return (elements || []).map((e: any) => ({
      id: e.organizationalTarget.split(':').pop(),
      page: e.organizationalTarget.split(':').pop(),
      username: e['organizationalTarget~'].vanityName,
      name: e['organizationalTarget~'].localizedName,
      picture:
        e['organizationalTarget~'].logoV2?.['original~']?.elements?.[0]
          ?.identifiers?.[0]?.identifier,
    }));
  }

  async reConnect(
    id: string,
    requiredId: string,
    accessToken: string
  ): Promise<AuthTokenDetails> {
    const information = await this.fetchPageInformation(
      accessToken,
      requiredId
    );

    return {
      id: information.id,
      name: information.name,
      accessToken: information.access_token,
      refreshToken: information.access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: information.picture,
      username: information.username,
    };
  }

  async fetchPageInformation(accessToken: string, pageId: string) {
    const data = await (
      await fetch(
        `https://api.linkedin.com/v2/organizations/${pageId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams))`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    ).json();

    return {
      id: data.id,
      name: data.localizedName,
      access_token: accessToken,
      picture:
        data?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0].identifier,
      username: data.vanityName,
    };
  }

  override async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', params.code);
    body.append(
      'redirect_uri',
      `${process.env.FRONTEND_URL}/integrations/social/linkedin-page`
    );
    body.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
    body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);

    const {
      access_token: accessToken,
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope,
    } = await (
      await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    ).json();

    this.checkScopes(this.scopes, scope);

    const {
      name,
      sub: id,
      picture,
    } = await (
      await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const { vanityName } = await (
      await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id: `p_${id}`,
      accessToken,
      refreshToken,
      expiresIn,
      name,
      picture,
      username: vanityName,
    };
  }

  override async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return super.post(id, accessToken, postDetails, integration, 'company');
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const endDate = dayjs().unix() * 1000;
    const startDate = dayjs().subtract(date, 'days').unix() * 1000;

    const { elements }: { elements: Root[]; paging: any } = await (
      await fetch(
        `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=${encodeURIComponent(
          `urn:li:organization:${id}`
        )}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Linkedin-Version': '202405',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )
    ).json();

    const { elements: elements2 }: { elements: Root[]; paging: any } = await (
      await fetch(
        `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(
          `urn:li:organization:${id}`
        )}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Linkedin-Version': '202405',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )
    ).json();

    const { elements: elements3 }: { elements: Root[]; paging: any } = await (
      await fetch(
        `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(
          `urn:li:organization:${id}`
        )}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Linkedin-Version': '202405',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )
    ).json();

    const analytics = [...elements2, ...elements, ...elements3].reduce(
      (all, current) => {
        if (
          typeof current?.totalPageStatistics?.views?.allPageViews
            ?.pageViews !== 'undefined'
        ) {
          all['Page Views'].push({
            total: current.totalPageStatistics.views.allPageViews.pageViews,
            date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
          });
        }

        if (
          typeof current?.followerGains?.organicFollowerGain !== 'undefined'
        ) {
          all['Organic Followers'].push({
            total: current?.followerGains?.organicFollowerGain,
            date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
          });
        }

        if (typeof current?.followerGains?.paidFollowerGain !== 'undefined') {
          all['Paid Followers'].push({
            total: current?.followerGains?.paidFollowerGain,
            date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
          });
        }

        if (typeof current?.totalShareStatistics !== 'undefined') {
          all['Clicks'].push({
            total: current?.totalShareStatistics.clickCount,
            date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
          });

          all['Shares'].push({
            total: current?.totalShareStatistics.shareCount,
            date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
          });

          all['Engagement'].push({
            total: current?.totalShareStatistics.engagement,
            date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
          });

          all['Comments'].push({
            total: current?.totalShareStatistics.commentCount,
            date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
          });
        }

        return all;
      },
      {
        'Page Views': [] as any[],
        Clicks: [] as any[],
        Shares: [] as any[],
        Engagement: [] as any[],
        Comments: [] as any[],
        'Organic Followers': [] as any[],
        'Paid Followers': [] as any[],
      }
    );

    return Object.keys(analytics).map((key) => ({
      label: key,
      data: analytics[
        key as 'Page Views' | 'Organic Followers' | 'Paid Followers'
      ],
      percentageChange: 5,
    }));
  }

  @Plug({
    identifier: 'linkedin-page-autoRepostPost',
    title: 'Auto Repost Posts',
    description:
      'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
    ],
  })
  async autoRepostPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string }
  ) {
    const {
      likesSummary: { totalLikes },
    } = await (
      await this.fetch(
        `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(id)}`,
        {
          method: 'GET',
          headers: {
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202501',
            Authorization: `Bearer ${integration.token}`,
          },
        }
      )
    ).json();

    if (totalLikes >= +fields.likesAmount) {
      await timer(2000);
      await this.fetch(`https://api.linkedin.com/rest/posts`, {
        body: JSON.stringify({
          author: `urn:li:organization:${integration.internalId}`,
          commentary: '',
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
          reshareContext: {
            parent: id,
          },
        }),
        method: 'POST',
        headers: {
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202504',
          Authorization: `Bearer ${integration.token}`,
        },
      });
      return true;
    }

    return false;
  }

  @Plug({
    identifier: 'linkedin-page-autoPlugPost',
    title: 'Auto plug post',
    description:
      'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
      {
        name: 'post',
        type: 'richtext',
        placeholder: 'Post to plug',
        description: 'Message content to plug',
        validation: /^[\s\S]{3,}$/g,
      },
    ],
  })
  async autoPlugPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string; post: string }
  ) {
    const {
      likesSummary: { totalLikes },
    } = await (
      await this.fetch(
        `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(id)}`,
        {
          method: 'GET',
          headers: {
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202501',
            Authorization: `Bearer ${integration.token}`,
          },
        }
      )
    ).json();

    if (totalLikes >= fields.likesAmount) {
      await timer(2000);
      await this.fetch(
        `https://api.linkedin.com/v2/socialActions/${decodeURIComponent(
          id
        )}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.token}`,
          },
          body: JSON.stringify({
            actor: `urn:li:organization:${integration.internalId}`,
            object: id,
            message: {
              text: this.fixText(fields.post),
            },
          }),
        }
      );
      return true;
    }

    return false;
  }
}

export interface Root {
  pageStatisticsByIndustryV2: any[];
  pageStatisticsBySeniority: any[];
  organization: string;
  pageStatisticsByGeoCountry: any[];
  pageStatisticsByTargetedContent: any[];
  totalPageStatistics: TotalPageStatistics;
  pageStatisticsByStaffCountRange: any[];
  pageStatisticsByFunction: any[];
  pageStatisticsByGeo: any[];
  followerGains: { organicFollowerGain: number; paidFollowerGain: number };
  timeRange: TimeRange;
  totalShareStatistics: {
    uniqueImpressionsCount: number;
    shareCount: number;
    engagement: number;
    clickCount: number;
    likeCount: number;
    impressionCount: number;
    commentCount: number;
  };
}

export interface TotalPageStatistics {
  clicks: Clicks;
  views: Views;
}

export interface Clicks {
  mobileCustomButtonClickCounts: any[];
  desktopCustomButtonClickCounts: any[];
}

export interface Views {
  mobileProductsPageViews: MobileProductsPageViews;
  allDesktopPageViews: AllDesktopPageViews;
  insightsPageViews: InsightsPageViews;
  mobileAboutPageViews: MobileAboutPageViews;
  allMobilePageViews: AllMobilePageViews;
  productsPageViews: ProductsPageViews;
  desktopProductsPageViews: DesktopProductsPageViews;
  jobsPageViews: JobsPageViews;
  peoplePageViews: PeoplePageViews;
  overviewPageViews: OverviewPageViews;
  mobileOverviewPageViews: MobileOverviewPageViews;
  lifeAtPageViews: LifeAtPageViews;
  desktopOverviewPageViews: DesktopOverviewPageViews;
  mobileCareersPageViews: MobileCareersPageViews;
  allPageViews: AllPageViews;
  careersPageViews: CareersPageViews;
  mobileJobsPageViews: MobileJobsPageViews;
  mobileLifeAtPageViews: MobileLifeAtPageViews;
  desktopJobsPageViews: DesktopJobsPageViews;
  desktopPeoplePageViews: DesktopPeoplePageViews;
  aboutPageViews: AboutPageViews;
  desktopAboutPageViews: DesktopAboutPageViews;
  mobilePeoplePageViews: MobilePeoplePageViews;
  desktopCareersPageViews: DesktopCareersPageViews;
  desktopInsightsPageViews: DesktopInsightsPageViews;
  desktopLifeAtPageViews: DesktopLifeAtPageViews;
  mobileInsightsPageViews: MobileInsightsPageViews;
}

export interface MobileProductsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface AllDesktopPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface InsightsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface MobileAboutPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface AllMobilePageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface ProductsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopProductsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface JobsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface PeoplePageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface OverviewPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface MobileOverviewPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface LifeAtPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopOverviewPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface MobileCareersPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface AllPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface CareersPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface MobileJobsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface MobileLifeAtPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopJobsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopPeoplePageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface AboutPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopAboutPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface MobilePeoplePageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopCareersPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopInsightsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface DesktopLifeAtPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface MobileInsightsPageViews {
  pageViews: number;
  uniquePageViews: number;
}

export interface TimeRange {
  start: number;
  end: number;
}
