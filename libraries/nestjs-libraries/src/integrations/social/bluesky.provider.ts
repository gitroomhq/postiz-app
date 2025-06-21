import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  RefreshToken,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { 
  BskyAgent, 
  RichText, 
  AppBskyEmbedVideo,
  AppBskyEmbedExternal,
  AppBskyVideoDefs,
  AtpAgent,
  BlobRef 
} from '@atproto/api';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import sharp from 'sharp';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { timer } from '@gitroom/helpers/utils/timer';
import axios from 'axios';
import { JSDOM } from 'jsdom';

async function reduceImageBySize(url: string, maxSizeKB = 976) {
  try {
    // Fetch the image from the URL
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let imageBuffer = Buffer.from(response.data);

    // Use sharp to get the metadata of the image
    const metadata = await sharp(imageBuffer).metadata();
    let width = metadata.width!;
    let height = metadata.height!;

    // Resize iteratively until the size is below the threshold
    while (imageBuffer.length / 1024 > maxSizeKB) {
      width = Math.floor(width * 0.9); // Reduce dimensions by 10%
      height = Math.floor(height * 0.9);

      // Resize the image
      const resizedBuffer = await sharp(imageBuffer)
        .resize({ width, height })
        .toBuffer();

      imageBuffer = resizedBuffer;

      if (width < 10 || height < 10) break; // Prevent overly small dimensions
    }

    return imageBuffer;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

async function uploadVideo(agent: AtpAgent, videoPath: string): Promise<AppBskyEmbedVideo.Main> {
  const { data: serviceAuth } = await agent.com.atproto.server.getServiceAuth(
    {
      aud: `did:web:${agent.dispatchUrl.host}`,
      lxm: "com.atproto.repo.uploadBlob",
      exp: Date.now() / 1000 + 60 * 30, // 30 minutes
    },
  );

  async function downloadVideo(url: string): Promise<{ video: Buffer, size: number }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const video = Buffer.from(arrayBuffer);
    const size = video.length;
    return { video, size };
  }

  const video = await downloadVideo(videoPath);

  console.log("Downloaded video", videoPath, video.size);
  
  const uploadUrl = new URL("https://video.bsky.app/xrpc/app.bsky.video.uploadVideo");
  uploadUrl.searchParams.append("did", agent.session!.did);
  uploadUrl.searchParams.append("name", videoPath.split("/").pop()!);
  
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceAuth.token}`,
      "Content-Type": "video/mp4",
      "Content-Length": video.size.toString(),
    },
    body: video.video
  });
  
  const jobStatus = (await uploadResponse.json()) as AppBskyVideoDefs.JobStatus;
  console.log("JobId:", jobStatus.jobId);
  let blob: BlobRef | undefined = jobStatus.blob;
  const videoAgent = new AtpAgent({ service: "https://video.bsky.app" });
  
  while (!blob) {
    const { data: status } = await videoAgent.app.bsky.video.getJobStatus(
      { jobId: jobStatus.jobId },
    );
    console.log(
      "Status:",
      status.jobStatus.state,
      status.jobStatus.progress || "",
    );
    if (status.jobStatus.blob) {
      blob = status.jobStatus.blob;
    }
    // wait a second
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  console.log("posting video...");

  return {
    $type: "app.bsky.embed.video",
    video: blob,
  } satisfies AppBskyEmbedVideo.Main;
}

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

async function createExternalEmbed(agent: BskyAgent, url: string): Promise<AppBskyEmbedExternal.Main | null> {
  try {
    const ogData = await fetchOpenGraphData(url);
    
    const external: AppBskyEmbedExternal.External = {
      uri: url,
      title: ogData.title || 'Link',
      description: ogData.description || ''
    };

    // If there's an image, upload it as thumbnail
    if (ogData.image) {
      try {
        const imageResponse = await axios.get(ogData.image, { 
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PostizBot/1.0; +https://postiz.com/)'
          }
        });
        const imageBuffer = Buffer.from(imageResponse.data);
        
        // Reduce image size if needed (Bluesky has limits)
        const processedImage = await reduceImageBySize(ogData.image, 976);
        
        const blob = await agent.uploadBlob(new Blob([processedImage]));
        external.thumb = blob.data.blob;
      } catch (imageError) {
        console.error('Error uploading thumbnail:', imageError);
        // Continue without thumbnail
      }
    }

    return {
      $type: 'app.bsky.embed.external',
      external
    } satisfies AppBskyEmbedExternal.Main;
  } catch (error) {
    console.error('Error creating external embed:', error);
    return null;
  }
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
  return text.match(urlRegex) || [];
}

export class BlueskyProvider extends SocialAbstract implements SocialProvider {
  identifier = 'bluesky';
  name = 'Bluesky';
  isBetweenSteps = false;
  scopes = ['write:statuses', 'profile', 'write:media'];

  async customFields() {
    return [
      {
        key: 'service',
        label: 'Service',
        defaultValue: 'https://bsky.social',
        validation: `/^(https?:\\/\\/)?((([a-zA-Z0-9\\-_]{1,256}\\.[a-zA-Z]{2,6})|(([0-9]{1,3}\\.){3}[0-9]{1,3}))(:[0-9]{1,5})?)(\\/[^\\s]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'identifier',
        label: 'Identifier',
        validation: `/^.+$/`,
        type: 'text' as const,
      },
      {
        key: 'password',
        label: 'Password',
        validation: `/^.{3,}$/`,
        type: 'password' as const,
      },
    ];
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
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
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = JSON.parse(Buffer.from(params.code, 'base64').toString());

    try {
      const agent = new BskyAgent({
        service: body.service,
      });

      const {
        data: { accessJwt, refreshJwt, handle, did },
      } = await agent.login({
        identifier: body.identifier,
        password: body.password,
      });

      const profile = await agent.getProfile({
        actor: did,
      });

      return {
        refreshToken: refreshJwt,
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: accessJwt,
        id: did,
        name: profile.data.displayName!,
        picture: profile.data.avatar!,
        username: profile.data.handle!,
      };
    } catch (e) {
      console.log(e);
      return 'Invalid credentials';
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const body = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );
    const agent = new BskyAgent({
      service: body.service,
    });

    try {
      await agent.login({
        identifier: body.identifier,
        password: body.password,
      });
    } catch (err) {
      throw new RefreshToken('bluesky', JSON.stringify(err), {} as BodyInit);
    }

    let loadCid = '';
    let loadUri = '';
    const cidUrl = [] as { cid: string; url: string; rev: string }[];
    for (const post of postDetails) {
      // Separate images and videos
      const imageMedia = post.media?.filter((p) => p.url.indexOf('mp4') === -1) || [];
      const videoMedia = post.media?.filter((p) => p.url.indexOf('mp4') !== -1) || [];

      // Upload images
      const images = await Promise.all(
        imageMedia.map(async (p) => {
          return await agent.uploadBlob(
            new Blob([await reduceImageBySize(p.url)])
          );
        })
      );

      // Upload videos (only one video per post is supported by Bluesky)
      let videoEmbed: AppBskyEmbedVideo.Main | null = null;
      if (videoMedia.length > 0) {
        videoEmbed = await uploadVideo(agent, videoMedia[0].url);
      }

      const rt = new RichText({
        text: post.message,
      });

      await rt.detectFacets(agent);

      // Determine embed based on media types and URLs
      let embed: any = {};
      if (videoEmbed) {
        // If there's a video, use video embed (Bluesky supports only one video per post)
        embed = videoEmbed;
      } else if (images.length > 0) {
        // If there are images but no video, use image embed
        embed = {
          $type: 'app.bsky.embed.images',
          images: images.map((p) => ({
            alt: 'picture',
            image: p.data.blob,
          })),
        };
      } else {
        // If no media, check for URLs to create external embeds
        const urls = extractUrls(post.message);
        if (urls.length > 0) {
          // Use the first URL found for the external embed
          const externalEmbed = await createExternalEmbed(agent, urls[0]);
          if (externalEmbed) {
            embed = externalEmbed;
          }
        }
      }

      // @ts-ignore
      const { cid, uri, commit } = await agent.post({
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        ...(Object.keys(embed).length > 0 ? { embed } : {}),
        ...(loadCid
          ? {
              reply: {
                root: {
                  uri: loadUri,
                  cid: loadCid,
                },
                parent: {
                  uri: loadUri,
                  cid: loadCid,
                },
              },
            }
          : {}),
      });

      loadCid = loadCid || cid;
      loadUri = loadUri || uri;

      cidUrl.push({ cid, url: uri, rev: commit.rev });
    }

    if (postDetails?.[0]?.settings?.active_thread_finisher) {
      const rt = new RichText({
        text: postDetails?.[0]?.settings?.thread_finisher,
      });

      await rt.detectFacets(agent);

      await agent.post({
        text: postDetails?.[0]?.settings?.thread_finisher,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        embed: {
          $type: 'app.bsky.embed.record',
          record: {
            uri: cidUrl[0].url,
            cid: cidUrl[0].cid,
          },
        },
        ...(loadCid
          ? {
              reply: {
                root: {
                  uri: loadUri,
                  cid: loadCid,
                },
                parent: {
                  uri: loadUri,
                  cid: loadCid,
                },
              },
            }
          : {}),
      });
    }

    return postDetails.map((p, index) => ({
      id: p.id,
      postId: cidUrl[index].url,
      status: 'completed',
      releaseURL: `https://bsky.app/profile/${id}/post/${cidUrl[index].url
        .split('/')
        .pop()}`,
    }));
  }

  @Plug({
    identifier: 'bluesky-autoRepostPost',
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
    const body = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );
    const agent = new BskyAgent({
      service: body.service,
    });

    await agent.login({
      identifier: body.identifier,
      password: body.password,
    });

    const getThread = await agent.getPostThread({
      uri: id,
      depth: 0,
    });

    // @ts-ignore
    if (getThread.data.thread.post?.likeCount >= +fields.likesAmount) {
      await timer(2000);
      await agent.repost(
        // @ts-ignore
        getThread.data.thread.post?.uri,
        // @ts-ignore
        getThread.data.thread.post?.cid
      );
      return true;
    }

    return true;
  }

  @Plug({
    identifier: 'bluesky-autoPlugPost',
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
    const body = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );
    const agent = new BskyAgent({
      service: body.service,
    });

    await agent.login({
      identifier: body.identifier,
      password: body.password,
    });

    const getThread = await agent.getPostThread({
      uri: id,
      depth: 0,
    });

    // @ts-ignore
    if (getThread.data.thread.post?.likeCount >= +fields.likesAmount) {
      await timer(2000);
      const rt = new RichText({
        text: fields.post,
      });

      await agent.post({
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        reply: {
          root: {
            // @ts-ignore
            uri: getThread.data.thread.post?.uri,
            // @ts-ignore
            cid: getThread.data.thread.post?.cid,
          },
          parent: {
            // @ts-ignore
            uri: getThread.data.thread.post?.uri,
            // @ts-ignore
            cid: getThread.data.thread.post?.cid,
          },
        },
      });
      return true;
    }

    return true;
  }
}
