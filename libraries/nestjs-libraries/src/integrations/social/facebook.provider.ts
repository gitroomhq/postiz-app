import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import axios from 'axios';
import { JSDOM } from 'jsdom';

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
}

async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
  try {
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PostizBot/1.0; +https://postiz.com/)'
      }
    });
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const getMetaContent = (property: string) => {
      const element = document.querySelector(`meta[property="${property}"]`) || 
                    document.querySelector(`meta[name="${property}"]`);
      return element?.getAttribute('content') || '';
    };

    const ogImage = getMetaContent('og:image');
    let imageUrl = ogImage;
    
    // Handle relative URLs for images
    if (ogImage && !ogImage.startsWith('http')) {
      try {
        imageUrl = new URL(ogImage, url).href;
      } catch {
        imageUrl = ogImage; // Fallback to original if URL parsing fails
      }
    }

    return {
      title: getMetaContent('og:title') || getMetaContent('title') || 
             document.querySelector('title')?.textContent || '',
      description: getMetaContent('og:description') || getMetaContent('description') || '',
      image: imageUrl || ''
    };
  } catch (error) {
    console.error('Error fetching OpenGraph data:', error);
    return {};
  }
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
  return text.match(urlRegex) || [];
}

export class FacebookProvider extends SocialAbstract implements SocialProvider {  identifier = 'facebook';
  name = 'Facebook Page';
  isBetweenSteps = true;
  scopes = [
    'pages_show_list',
    'business_management',
    'pages_manage_posts',
    'pages_manage_engagement',
    'pages_read_engagement',
    'read_insights',
  ];
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
        'https://www.facebook.com/v20.0/dialog/oauth' +
        `?client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.FRONTEND_URL}/integrations/social/facebook`
        )}` +
        `&state=${state}` +
        `&scope=${this.scopes.join(',')}`,
      codeVerifier: makeId(10),
      state,
    };
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

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const getAccessToken = await (
      await this.fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          `?client_id=${process.env.FACEBOOK_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${process.env.FRONTEND_URL}/integrations/social/facebook${
              params.refresh ? `?refresh=${params.refresh}` : ''
            }`
          )}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&code=${params.code}`
      )
    ).json();

    const { access_token } = await (
      await this.fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          '?grant_type=fb_exchange_token' +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${getAccessToken.access_token}&fields=access_token,expires_in`
      )
    ).json();

    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`
      )
    ).json();

    const permissions = data
      .filter((d: any) => d.status === 'granted')
      .map((p: any) => p.permission);
    this.checkScopes(this.scopes, permissions);

    const {
      id,
      name,
      picture: {
        data: { url },
      },
    } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`
      )
    ).json();

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: url,
      username: '',
    };
  }

  async pages(accessToken: string) {
    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,username,name,picture.type(large)&access_token=${accessToken}`
      )
    ).json();

    return data;
  }

  async fetchPageInformation(accessToken: string, pageId: string) {
    const {
      id,
      name,
      access_token,
      username,
      picture: {
        data: { url },
      },
    } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${pageId}?fields=username,access_token,name,picture.type(large)&access_token=${accessToken}`
      )
    ).json();

    return {
      id,
      name,
      access_token,
      picture: url,
      username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost, ...comments] = postDetails;

    let finalId = '';
    let finalUrl = '';
    
    // Enhanced URL detection for Facebook link previews
    const urls = extractUrls(firstPost.message);
    const hasUrls = urls.length > 0;
    
    // Log URL detection for debugging
    if (hasUrls) {
      console.log('Facebook: Detected URLs for potential link preview:', urls);
    }
    
    if ((firstPost?.media?.[0]?.url?.indexOf('mp4') || -2) > -1) {
      // Handle video posts
      const {
        id: videoId,
        permalink_url,
        ...all
      } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${id}/videos?access_token=${accessToken}&fields=id,permalink_url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_url: firstPost?.media?.[0]?.url!,
              description: firstPost.message,
              published: true,
            }),
          },
          'upload mp4'
        )
      ).json();

      finalUrl = 'https://www.facebook.com/reel/' + videoId;
      finalId = videoId;
    } else {
      // Handle image/text posts with potential link previews
      const uploadPhotos = !firstPost?.media?.length
        ? []
        : await Promise.all(
            firstPost.media.map(async (media) => {
              const { id: photoId } = await (
                await this.fetch(
                  `https://graph.facebook.com/v20.0/${id}/photos?access_token=${accessToken}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: media.url,
                      published: false,
                    }),
                  },
                  'upload images slides'
                )
              ).json();

              return { media_fbid: photoId };
            })
          );

      // Enhanced post payload for better link preview handling
      const postPayload: any = {
        message: firstPost.message,
        published: true,
      };

      // Add media if available
      if (uploadPhotos?.length) {
        postPayload.attached_media = uploadPhotos;
      }
      // CRITICAL: Use Facebook's 'link' parameter for URL previews
      else if (hasUrls && !uploadPhotos?.length) {
        console.log('Facebook: Detected URL for link preview:', urls[0]);
        
        // Remove URL from message text since we're putting it in the link field
        const messageWithoutUrl = firstPost.message.replace(urls[0], '').trim();
        
        postPayload.message = messageWithoutUrl;
        postPayload.link = urls[0]; // Facebook's link parameter for previews
        
        console.log('Facebook: Using link parameter for preview generation');
        
        // Optional: Pre-warm Facebook's scraper by hitting their debug API
        try {
          await this.prewarmFacebookScraper(urls[0], accessToken);
        } catch (error) {
          console.log('Facebook: Could not prewarm scraper, proceeding with normal post');
        }
      }

      const {
        id: postId,
        permalink_url,
        ...all
      } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${id}/feed?access_token=${accessToken}&fields=id,permalink_url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postPayload),
          },
          'finalize upload'
        )
      ).json();

      finalUrl = permalink_url;
      finalId = postId;
    }

    // Handle comment posts
    const postsArray = [];
    for (const comment of comments) {
      const data = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${finalId}/comments?access_token=${accessToken}&fields=id,permalink_url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...(comment.media?.length
                ? { attachment_url: comment.media[0].url }
                : {}),
              message: comment.message,
            }),
          },
          'add comment'
        )
      ).json();

      postsArray.push({
        id: comment.id,
        postId: data.id,
        releaseURL: data.permalink_url,
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

  // Optional: Pre-warm Facebook's link scraper for better preview generation
  private async prewarmFacebookScraper(url: string, accessToken: string): Promise<void> {
    try {
      // Use Facebook's debug API to pre-scrape the URL
      await this.fetch(
        `https://graph.facebook.com/v20.0/?id=${encodeURIComponent(url)}&scrape=true&access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Facebook: Successfully prewarmed scraper for URL:', url);
    } catch (error) {
      console.log('Facebook: Prewarm scraper failed (this is optional):', error);
      // Don't throw - this is just an optimization
    }
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const until = dayjs().endOf('day').unix();
    const since = dayjs().subtract(date, 'day').unix();

    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${id}/insights?metric=page_impressions_unique,page_posts_impressions_unique,page_post_engagements,page_daily_follows,page_video_views&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();

    return (
      data?.map((d: any) => ({
        label:
          d.name === 'page_impressions_unique'
            ? 'Page Impressions'
            : d.name === 'page_post_engagements'
            ? 'Posts Engagement'
            : d.name === 'page_daily_follows'
            ? 'Page followers'
            : d.name === 'page_video_views'
            ? 'Videos views'
            : 'Posts Impressions',
        percentageChange: 5,
        data: d?.values?.map((v: any) => ({
          total: v.value,
          date: dayjs(v.end_time).format('YYYY-MM-DD'),
        })),
      })) || []
    );
  }
}
