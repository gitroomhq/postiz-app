import { Injectable } from '@nestjs/common';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import dayjs from 'dayjs';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { Integration, Post, Media, From } from '@prisma/client';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { capitalize, shuffle } from 'lodash';
import { MessagesService } from '@gitroom/nestjs-libraries/database/prisma/marketplace/messages.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { GeneratorDto } from '@gitroom/nestjs-libraries/dtos/generator/generator.dto';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { CreateGeneratedPostsDto } from '@gitroom/nestjs-libraries/dtos/generator/create.generated.posts.dto';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  BadBody,
  RefreshToken,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import { timer } from '@gitroom/helpers/utils/timer';

type PostWithConditionals = Post & {
  integration?: Integration;
  childrenPost: Post[];
};

@Injectable()
export class PostsService {
  constructor(
    private _postRepository: PostsRepository,
    private _workerServiceProducer: BullMqClient,
    private _integrationManager: IntegrationManager,
    private _notificationService: NotificationService,
    private _messagesService: MessagesService,
    private _stripeService: StripeService,
    private _extractContentService: ExtractContentService,
    private _openAiService: OpenaiService,
    private _integrationService: IntegrationService
  ) {}

  async getPostsRecursively(
    id: string,
    includeIntegration = false,
    orgId?: string,
    isFirst?: boolean
  ): Promise<PostWithConditionals[]> {
    const post = await this._postRepository.getPost(
      id,
      includeIntegration,
      orgId,
      isFirst
    );

    return [
      post!,
      ...(post?.childrenPost?.length
        ? await this.getPostsRecursively(
            post.childrenPost[0].id,
            false,
            orgId,
            false
          )
        : []),
    ];
  }

  getPosts(orgId: string, query: GetPostsDto) {
    return this._postRepository.getPosts(orgId, query);
  }

  async getPost(orgId: string, id: string) {
    const posts = await this.getPostsRecursively(id, true, orgId, true);
    return {
      group: posts?.[0]?.group,
      posts: posts.map((post) => ({
        ...post,
        image: JSON.parse(post.image || '[]'),
      })),
      integrationPicture: posts[0]?.integration?.picture,
      integration: posts[0].integrationId,
      settings: JSON.parse(posts[0].settings || '{}'),
    };
  }

  async getOldPosts(orgId: string, date: string) {
    return this._postRepository.getOldPosts(orgId, date);
  }

  async post(id: string) {
    const [firstPost, ...morePosts] = await this.getPostsRecursively(id, true);
    if (!firstPost) {
      return;
    }

    if (firstPost.integration?.refreshNeeded) {
      await this._notificationService.inAppNotification(
        firstPost.organizationId,
        `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`,
        `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name} because you need to reconnect it. Please enable it and try again.`,
        true
      );
      return;
    }

    if (firstPost.integration?.disabled) {
      await this._notificationService.inAppNotification(
        firstPost.organizationId,
        `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`,
        `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name} because it's disabled. Please enable it and try again.`,
        true
      );
      return;
    }

    try {
      const finalPost =
        firstPost.integration?.type === 'article'
          ? await this.postArticle(firstPost.integration!, [
              firstPost,
              ...morePosts,
            ])
          : await this.postSocial(firstPost.integration!, [
              firstPost,
              ...morePosts,
            ]);

      if (!finalPost?.postId || !finalPost?.releaseURL) {
        await this._postRepository.changeState(firstPost.id, 'ERROR');
        await this._notificationService.inAppNotification(
          firstPost.organizationId,
          `Error posting on ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`,
          `An error occurred while posting on ${firstPost.integration?.providerIdentifier}`,
          true
        );

        return;
      }

      if (firstPost.submittedForOrderId) {
        this._workerServiceProducer.emit('submit', {
          payload: {
            id: firstPost.id,
            releaseURL: finalPost.releaseURL,
          },
        });
      }
    } catch (err: any) {
      await this._postRepository.changeState(firstPost.id, 'ERROR');
      await this._notificationService.inAppNotification(
        firstPost.organizationId,
        `Error posting on ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`,
        `An error occurred while posting on ${
          firstPost.integration?.providerIdentifier
        } ${
          !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
            ? err
            : ''
        }`,
        true
      );

      if (err instanceof BadBody) {
        console.error(
          '[Error] posting on',
          firstPost.integration?.providerIdentifier,
          err.identifier,
          err.json,
          err.body,
          err
        );

        return;
      }

      console.error(
        '[Error] posting on',
        firstPost.integration?.providerIdentifier,
        err
      );
    }
  }

  private async updateTags(orgId: string, post: Post[]): Promise<Post[]> {
    const plainText = JSON.stringify(post);
    const extract = Array.from(
      plainText.match(/\(post:[a-zA-Z0-9-_]+\)/g) || []
    );
    if (!extract.length) {
      return post;
    }

    const ids = extract.map((e) => e.replace('(post:', '').replace(')', ''));
    const urls = await this._postRepository.getPostUrls(orgId, ids);
    const newPlainText = ids.reduce((acc, value) => {
      const findUrl = urls?.find?.((u) => u.id === value)?.releaseURL || '';
      return acc.replace(
        new RegExp(`\\(post:${value}\\)`, 'g'),
        findUrl.split(',')[0]
      );
    }, plainText);

    return this.updateTags(orgId, JSON.parse(newPlainText) as Post[]);
  }

  private async postSocial(
    integration: Integration,
    posts: Post[],
    forceRefresh = false
  ): Promise<Partial<{ postId: string; releaseURL: string }>> {
    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    if (!getIntegration) {
      return {};
    }

    if (dayjs(integration?.tokenExpiration).isBefore(dayjs()) || forceRefresh) {
      const { accessToken, expiresIn, refreshToken } =
        await getIntegration.refreshToken(integration.refreshToken!);

      if (!accessToken) {
        await this._integrationService.refreshNeeded(
          integration.organizationId,
          integration.id
        );

        await this._integrationService.informAboutRefreshError(
          integration.organizationId,
          integration
        );
        return {};
      }

      await this._integrationService.createOrUpdateIntegration(
        integration.organizationId,
        integration.name,
        integration.picture!,
        'social',
        integration.internalId,
        integration.providerIdentifier,
        accessToken,
        refreshToken,
        expiresIn
      );

      integration.token = accessToken;

      if (getIntegration.refreshWait) {
        await timer(10000);
      }
    }

    const newPosts = await this.updateTags(integration.organizationId, posts);

    try {
      const publishedPosts = await getIntegration.post(
        integration.internalId,
        integration.token,
        newPosts.map((p) => ({
          id: p.id,
          message: p.content,
          settings: JSON.parse(p.settings || '{}'),
          media: (JSON.parse(p.image || '[]') as Media[]).map((m) => ({
            url:
              m.path.indexOf('http') === -1
                ? process.env.FRONTEND_URL +
                  '/' +
                  process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
                  m.path
                : m.path,
            type: 'image',
            path:
              m.path.indexOf('http') === -1
                ? process.env.UPLOAD_DIRECTORY + m.path
                : m.path,
          })),
        })),
        integration
      );

      for (const post of publishedPosts) {
        await this._postRepository.updatePost(
          post.id,
          post.postId,
          post.releaseURL
        );
      }

      await this._notificationService.inAppNotification(
        integration.organizationId,
        `Your post has been published on ${capitalize(
          integration.providerIdentifier
        )}`,
        `Your post has been published at ${publishedPosts[0].releaseURL}`,
        true
      );

      return {
        postId: publishedPosts[0].postId,
        releaseURL: publishedPosts[0].releaseURL,
      };
    } catch (err) {
      if (err instanceof RefreshToken) {
        return this.postSocial(integration, posts, true);
      }

      throw err;
    }
  }

  private async postArticle(integration: Integration, posts: Post[]) {
    const getIntegration = this._integrationManager.getArticlesIntegration(
      integration.providerIdentifier
    );
    if (!getIntegration) {
      return;
    }

    const newPosts = await this.updateTags(integration.organizationId, posts);

    const { postId, releaseURL } = await getIntegration.post(
      integration.token,
      newPosts.map((p) => p.content).join('\n\n'),
      JSON.parse(newPosts[0].settings || '{}')
    );

    await this._notificationService.inAppNotification(
      integration.organizationId,
      `Your article has been published on ${capitalize(
        integration.providerIdentifier
      )}`,
      `Your article has been published at ${releaseURL}`,
      true
    );
    await this._postRepository.updatePost(newPosts[0].id, postId, releaseURL);

    return {
      postId,
      releaseURL,
    };
  }

  async deletePost(orgId: string, group: string) {
    const post = await this._postRepository.deletePost(orgId, group);
    if (post?.id) {
      await this._workerServiceProducer.delete('post', post.id);
    }
  }

  async countPostsFromDay(orgId: string, date: Date) {
    return this._postRepository.countPostsFromDay(orgId, date);
  }

  async submit(
    id: string,
    order: string,
    message: string,
    integrationId: string
  ) {
    if (!(await this._messagesService.canAddPost(id, order, integrationId))) {
      throw new Error('You can not add a post to this publication');
    }
    const getOrgByOrder = await this._messagesService.getOrgByOrder(order);
    const submit = await this._postRepository.submit(
      id,
      order,
      getOrgByOrder?.messageGroup?.buyerOrganizationId!
    );
    const messageModel = await this._messagesService.createNewMessage(
      submit?.submittedForOrder?.messageGroupId || '',
      From.SELLER,
      '',
      {
        type: 'post',
        data: {
          id: order,
          postId: id,
          status: 'PENDING',
          integration: integrationId,
          description: message.slice(0, 300) + '...',
        },
      }
    );

    await this._postRepository.updateMessage(id, messageModel.id);

    return messageModel;
  }

  async createPost(orgId: string, body: CreatePostDto) {
    for (const post of body.posts) {
      const { previousPost, posts } =
        await this._postRepository.createOrUpdatePost(
          body.type,
          orgId,
          body.type === 'now'
            ? dayjs().format('YYYY-MM-DDTHH:mm:00')
            : body.date,
          post
        );

      if (!posts?.length) {
        return;
      }

      await this._workerServiceProducer.delete(
        'post',
        previousPost ? previousPost : posts?.[0]?.id
      );

      if (body.order && body.type !== 'draft') {
        await this.submit(
          posts[0].id,
          body.order,
          post.value[0].content,
          post.integration.id
        );
        continue;
      }

      if (
        body.type === 'now' ||
        (body.type === 'schedule' && dayjs(body.date).isAfter(dayjs()))
      ) {
        this._workerServiceProducer.emit('post', {
          id: posts[0].id,
          options: {
            delay:
              body.type === 'now'
                ? 0
                : dayjs(posts[0].publishDate).diff(dayjs(), 'millisecond'),
          },
          payload: {
            id: posts[0].id,
          },
        });
      }
    }
  }

  async changeDate(orgId: string, id: string, date: string) {
    const getPostById = await this._postRepository.getPostById(id, orgId);
    if (
      getPostById?.submittedForOrderId &&
      getPostById.approvedSubmitForOrder !== 'NO'
    ) {
      throw new Error(
        'You can not change the date of a post that has been submitted'
      );
    }

    await this._workerServiceProducer.delete('post', id);
    if (getPostById?.state !== 'DRAFT' && !getPostById?.submittedForOrderId) {
      this._workerServiceProducer.emit('post', {
        id: id,
        options: {
          delay: dayjs(date).diff(dayjs(), 'millisecond'),
        },
        payload: {
          id: id,
        },
      });
    }

    return this._postRepository.changeDate(orgId, id, date);
  }

  async payout(id: string, url: string) {
    const getPost = await this._postRepository.getPostById(id);
    if (!getPost || !getPost.submittedForOrder) {
      return;
    }

    const findPrice = getPost.submittedForOrder.ordersItems.find(
      (orderItem) => orderItem.integrationId === getPost.integrationId
    )!;

    await this._messagesService.createNewMessage(
      getPost.submittedForOrder.messageGroupId,
      From.SELLER,
      '',
      {
        type: 'published',
        data: {
          id: getPost.submittedForOrder.id,
          postId: id,
          status: 'PUBLISHED',
          integrationId: getPost.integrationId,
          integration: getPost.integration.providerIdentifier,
          picture: getPost.integration.picture,
          name: getPost.integration.name,
          url,
        },
      }
    );

    const totalItems = getPost.submittedForOrder.ordersItems.reduce(
      (all, p) => all + p.quantity,
      0
    );
    const totalPosts = getPost.submittedForOrder.posts.length;

    if (totalItems === totalPosts) {
      await this._messagesService.completeOrder(getPost.submittedForOrder.id);
      await this._messagesService.createNewMessage(
        getPost.submittedForOrder.messageGroupId,
        From.SELLER,
        '',
        {
          type: 'order-completed',
          data: {
            id: getPost.submittedForOrder.id,
            postId: id,
            status: 'PUBLISHED',
          },
        }
      );
    }

    try {
      await this._stripeService.payout(
        getPost.submittedForOrder.id,
        getPost.submittedForOrder.captureId!,
        getPost.submittedForOrder.seller.account!,
        findPrice.price
      );

      return this._notificationService.inAppNotification(
        getPost.integration.organizationId,
        'Payout completed',
        `You have received a payout of $${findPrice.price}`,
        true
      );
    } catch (err) {
      await this._messagesService.payoutProblem(
        getPost.submittedForOrder.id,
        getPost.submittedForOrder.seller.id,
        findPrice.price,
        id
      );
    }
  }

  async loadPostContent(postId: string) {
    const post = await this._postRepository.getPostById(postId);
    if (!post) {
      return '';
    }

    return post.content;
  }

  async generatePosts(orgId: string, body: GeneratorDto) {
    const content = body.url
      ? await this._extractContentService.extractContent(body.url)
      : await this.loadPostContent(body.post);

    const value = body.url
      ? await this._openAiService.extractWebsiteText(content!)
      : await this._openAiService.generatePosts(content!);
    return { list: value };
  }

  async generatePostsDraft(orgId: string, body: CreateGeneratedPostsDto) {
    const getAllIntegrations = (
      await this._integrationService.getIntegrationsList(orgId)
    ).filter((f) => !f.disabled && f.providerIdentifier !== 'reddit');

    // const posts = chunk(body.posts, getAllIntegrations.length);
    const allDates = dayjs()
      .isoWeek(body.week)
      .year(body.year)
      .startOf('isoWeek');

    const dates = [...new Array(7)].map((_, i) => {
      return allDates.add(i, 'day').format('YYYY-MM-DD');
    });

    const findTime = (): string => {
      const totalMinutes = Math.floor(Math.random() * 144) * 10;

      // Convert total minutes to hours and minutes
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      // Format hours and minutes to always be two digits
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const randomDate =
        shuffle(dates)[0] + 'T' + `${formattedHours}:${formattedMinutes}:00`;

      if (dayjs(randomDate).isBefore(dayjs())) {
        return findTime();
      }

      return randomDate;
    };

    for (const integration of getAllIntegrations) {
      for (const toPost of body.posts) {
        const group = makeId(10);
        const randomDate = findTime();

        await this.createPost(orgId, {
          type: 'draft',
          date: randomDate,
          order: '',
          posts: [
            {
              group,
              integration: {
                id: integration.id,
              },
              settings: {
                subtitle: '',
                title: '',
                tags: [],
                subreddit: [],
              },
              value: [
                ...toPost.list.map((l) => ({
                  id: '',
                  content: l.post,
                  image: [],
                })),
                {
                  id: '',
                  content: `Check out the full story here:\n${
                    body.postId || body.url
                  }`,
                  image: [],
                },
              ],
            },
          ],
        });
      }
    }
  }
}
