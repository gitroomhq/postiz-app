import {
    AnalyticsData,
    AuthTokenDetails,
    PostDetails,
    PostResponse,
    SocialProvider,
  } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
  import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
  import { timer } from '@gitroom/helpers/utils/timer';
  import dayjs from 'dayjs';
  import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
  import { Integration } from '@prisma/client';
  
  export class GitHubProvider extends SocialAbstract implements SocialProvider {
    identifier = 'github';
    name = 'GitHub';
    toolTip =
      'Connect your GitHub account to manage discussions and repositories';
    scopes = ['repo', 'read:org', 'read:discussion', 'write:discussion'];
    isBetweenSteps = false;
  
    async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
      return {
        refreshToken: '',
        expiresIn: 0,
        accessToken: '',
        id: '',
        name: '',
        picture: '',
        username: '',
      };
    }
  
    async generateAuthUrl() {
      const state = makeId(6);
      return {
        url:
          `https://github.com/login/oauth/authorize` +
          `?client_id=${process.env.GITHUB_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${process.env.FRONTEND_URL}/integrations/social/github`
          )}` +
          `&state=${state}` +
          `&scope=${encodeURIComponent(this.scopes.join(','))}`,
        codeVerifier: makeId(10),
        state,
      };
    }
  
    async authenticate(params: { code: string; codeVerifier: string }) {
      const getAccessToken = await (
        await this.fetch(`https://github.com/login/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: params.code,
          }),
        })
      ).json();
  
      const { access_token } = getAccessToken;
  
      const user = await (
        await this.fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
      ).json();
  
      return {
        id: user.id,
        name: user.name,
        accessToken: access_token,
        refreshToken: access_token,
        expiresIn: 3600,
        picture: user.avatar_url,
        username: user.login,
      };
    }
  
    async fetchDiscussions(accessToken: string, repo: string) {
      const { data } = await (
        await this.fetch(`https://api.github.com/repos/${repo}/discussions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      ).json();
      return data;
    }
  
    async postDiscussion(
      accessToken: string,
      repo: string,
      postDetails: PostDetails<any>
    ): Promise<PostResponse> {
      const { message } = postDetails;
      const { data } = await (
        await this.fetch(`https://api.github.com/repos/${repo}/discussions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            //title,
            body: message,
          }),
        })
      ).json();
  
      return {
        id: postDetails.id,
        postId: data.id,
        releaseURL: data.html_url,
        status: 'success',
      };
    }
  
    async analytics(accessToken: string, repo: string): Promise<AnalyticsData[]> {
      const { data } = await (
        await this.fetch(
          `https://api.github.com/repos/${repo}/stats/contributors`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )
      ).json();
  
      return data.map((contributor: any) => ({
        label: contributor.author.login,
        percentageChange: 0,
        data: contributor.weeks.map((week: any) => ({
          total: week.c,
          date: dayjs.unix(week.w).format('YYYY-MM-DD'),
        })),
      }));
    }
    async post(
      id: string,
      accessToken: string,
      postDetails: PostDetails<any>[],
      integration: Integration
    ): Promise<PostResponse[]> {
      const [firstPost, ...comments] = postDetails;
  
      if (!firstPost) {
        throw new Error('No post details provided');
      }
  
      let finalId = '';
      let finalUrl = '';
  
      // Step 1: Create a new discussion
      const discussionResponse = await this.postDiscussion(
        accessToken,
        integration.internalId,
        firstPost
      );
  
      finalId = discussionResponse.postId;
      finalUrl = discussionResponse.releaseURL;
  
      const postsArray: PostResponse[] = [];
  
      // Step 2: Add comments to the discussion
      for (const comment of comments) {
        const { data } = await (
          await this.fetch(
            `https://api.github.com/repos/${integration.internalId}/discussions/${finalId}/comments`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                body: comment.message,
              }),
            }
          )
        ).json();
  
        postsArray.push({
          id: comment.id,
          postId: data.id,
          releaseURL: data.html_url,
          status: 'success',
        });
      }
  
      return [
        {
          id: firstPost.id,
          postId: finalId,
          releaseURL: finalUrl,
          status: 'success',
        },
        ...postsArray,
      ];
    }
  }
  