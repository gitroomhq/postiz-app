import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Post as PostBody } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import { APPROVED_SUBMIT_FOR_ORDER, Post, State } from '@prisma/client';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { CreateTagDto } from '@gitroom/nestjs-libraries/dtos/posts/create.tag.dto';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(utc);

@Injectable()
export class PostsRepository {
  constructor(
    private _post: PrismaRepository<'post'>,
    private _popularPosts: PrismaRepository<'popularPosts'>,
    private _comments: PrismaRepository<'comments'>,
    private _tags: PrismaRepository<'tags'>,
    private _tagsPosts: PrismaRepository<'tagsPosts'>,
    private _errors: PrismaRepository<'errors'>
  ) {}

  getOldPosts(orgId: string, date: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        publishDate: {
          lte: dayjs(date).toDate(),
        },
        deletedAt: null,
        parentPostId: null,
      },
      orderBy: {
        publishDate: 'desc',
      },
      select: {
        id: true,
        content: true,
        publishDate: true,
        releaseURL: true,
        state: true,
        integration: {
          select: {
            id: true,
            name: true,
            providerIdentifier: true,
            picture: true,
            type: true,
          },
        },
      },
    });
  }

  updateImages(id: string, images: string) {
    return this._post.model.post.update({
      where: {
        id,
      },
      data: {
        image: images,
      },
    });
  }

  getPostUrls(orgId: string, ids: string[]) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        releaseURL: true,
      },
    });
  }

  async getPosts(orgId: string, query: GetPostsDto) {
    // Use the provided start and end dates directly
    const startDate = dayjs.utc(query.startDate).toDate();
    const endDate = dayjs.utc(query.endDate).toDate();

    const list = await this._post.model.post.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                organizationId: orgId,
              },
              {
                submittedForOrganizationId: orgId,
              },
            ],
          },
          {
            OR: [
              {
                publishDate: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              {
                intervalInDays: {
                  not: null,
                },
              },
            ],
          },
        ],
        deletedAt: null,
        parentPostId: null,
        ...(query.customer
          ? {
              integration: {
                customerId: query.customer,
              },
            }
          : {}),
      },
      select: {
        id: true,
        content: true,
        publishDate: true,
        releaseURL: true,
        submittedForOrganizationId: true,
        submittedForOrderId: true,
        state: true,
        intervalInDays: true,
        group: true,
        tags: {
          select: {
            tag: true,
          },
        },
        integration: {
          select: {
            id: true,
            providerIdentifier: true,
            name: true,
            picture: true,
          },
        },
      },
    });

    return list.reduce((all, post) => {
      if (!post.intervalInDays) {
        return [...all, post];
      }

      const addMorePosts = [];
      let startingDate = dayjs.utc(post.publishDate);
      while (dayjs.utc(endDate).isSameOrAfter(startingDate)) {
        if (dayjs(startingDate).isSameOrAfter(dayjs.utc(post.publishDate))) {
          addMorePosts.push({
            ...post,
            publishDate: startingDate.toDate(),
            actualDate: post.publishDate,
          });
        }

        startingDate = startingDate.add(post.intervalInDays, 'days');
      }

      return [...all, ...addMorePosts];
    }, [] as any[]);
  }

  async deletePost(orgId: string, group: string) {
    await this._post.model.post.updateMany({
      where: {
        organizationId: orgId,
        group,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return this._post.model.post.findFirst({
      where: {
        organizationId: orgId,
        group,
        parentPostId: null,
      },
      select: {
        id: true,
      },
    });
  }

  getPost(
    id: string,
    includeIntegration = false,
    orgId?: string,
    isFirst?: boolean
  ) {
    return this._post.model.post.findUnique({
      where: {
        id,
        ...(orgId ? { organizationId: orgId } : {}),
        deletedAt: null,
      },
      include: {
        ...(includeIntegration
          ? {
              integration: true,
              tags: {
                select: {
                  tag: true,
                },
              },
            }
          : {}),
        childrenPost: true,
      },
    });
  }

  updatePost(id: string, postId: string, releaseURL: string) {
    return this._post.model.post.update({
      where: {
        id,
      },
      data: {
        state: 'PUBLISHED',
        releaseURL,
        releaseId: postId,
      },
    });
  }

  async changeState(id: string, state: State, err?: any, body?: any) {
    const update = await this._post.model.post.update({
      where: {
        id,
      },
      data: {
        state,
        ...(err
          ? { error: typeof err === 'string' ? err : JSON.stringify(err) }
          : {}),
      },
      include: {
        integration: {
          select: {
            providerIdentifier: true,
          },
        },
      },
    });

    if (state === 'ERROR' && err && body) {
      try {
        await this._errors.model.errors.create({
          data: {
            message: typeof err === 'string' ? err : JSON.stringify(err),
            organizationId: update.organizationId,
            platform: update.integration.providerIdentifier,
            postId: update.id,
            body: typeof body === 'string' ? body : JSON.stringify(body),
          },
        });
      } catch (err) {}
    }

    return update;
  }

  async changeDate(orgId: string, id: string, date: string) {
    return this._post.model.post.update({
      where: {
        organizationId: orgId,
        id,
      },
      data: {
        publishDate: dayjs(date).toDate(),
      },
    });
  }

  countPostsFromDay(orgId: string, date: Date) {
    return this._post.model.post.count({
      where: {
        organizationId: orgId,
        publishDate: {
          gte: date,
        },
        OR: [
          {
            deletedAt: null,
            state: {
              in: ['QUEUE'],
            },
          },
          {
            state: 'PUBLISHED',
          },
        ],
      },
    });
  }

  async createOrUpdatePost(
    state: 'draft' | 'schedule' | 'now',
    orgId: string,
    date: string,
    body: PostBody,
    tags: { value: string; label: string }[],
    inter?: number
  ) {
    const posts: Post[] = [];
    const uuid = uuidv4();

    for (const value of body.value) {
      const updateData = (type: 'create' | 'update') => ({
        publishDate: dayjs(date).toDate(),
        integration: {
          connect: {
            id: body.integration.id,
            organizationId: orgId,
          },
        },
        ...(posts?.[posts.length - 1]?.id
          ? {
              parentPost: {
                connect: {
                  id: posts[posts.length - 1]?.id,
                },
              },
            }
          : type === 'update'
          ? {
              parentPost: {
                disconnect: true,
              },
            }
          : {}),
        content: value.content,
        group: uuid,
        intervalInDays: inter ? +inter : null,
        approvedSubmitForOrder: APPROVED_SUBMIT_FOR_ORDER.NO,
        state: state === 'draft' ? ('DRAFT' as const) : ('QUEUE' as const),
        image: JSON.stringify(value.image),
        settings: JSON.stringify(body.settings),
        organization: {
          connect: {
            id: orgId,
          },
        },
      });

      posts.push(
        await this._post.model.post.upsert({
          where: {
            id: value.id || uuidv4(),
          },
          create: { ...updateData('create') },
          update: {
            ...updateData('update'),
            lastMessage: {
              disconnect: true,
            },
            submittedForOrder: {
              disconnect: true,
            },
          },
        })
      );

      if (posts.length === 1) {
        await this._tagsPosts.model.tagsPosts.deleteMany({
          where: {
            post: {
              id: posts[0].id,
            },
          },
        });

        if (tags.length) {
          const tagsList = await this._tags.model.tags.findMany({
            where: {
              orgId: orgId,
              name: {
                in: tags.map((tag) => tag.label).filter((f) => f),
              },
            },
          });

          if (tagsList.length) {
            await this._post.model.post.update({
              where: {
                id: posts[posts.length - 1].id,
              },
              data: {
                tags: {
                  createMany: {
                    data: tagsList.map((tag) => ({
                      tagId: tag.id,
                    })),
                  },
                },
              },
            });
          }
        }
      }
    }

    const previousPost = body.group
      ? (
          await this._post.model.post.findFirst({
            where: {
              group: body.group,
              deletedAt: null,
              parentPostId: null,
            },
            select: {
              id: true,
            },
          })
        )?.id!
      : undefined;

    if (body.group) {
      await this._post.model.post.updateMany({
        where: {
          group: body.group,
          deletedAt: null,
        },
        data: {
          parentPostId: null,
          deletedAt: new Date(),
        },
      });
    }

    return { previousPost, posts };
  }

  async submit(id: string, order: string, buyerOrganizationId: string) {
    return this._post.model.post.update({
      where: {
        id,
      },
      data: {
        submittedForOrderId: order,
        approvedSubmitForOrder: 'WAITING_CONFIRMATION',
        submittedForOrganizationId: buyerOrganizationId,
      },
      select: {
        id: true,
        description: true,
        submittedForOrder: {
          select: {
            messageGroupId: true,
          },
        },
      },
    });
  }

  updateMessage(id: string, messageId: string) {
    return this._post.model.post.update({
      where: {
        id,
      },
      data: {
        lastMessageId: messageId,
      },
    });
  }

  getPostById(id: string, org?: string) {
    return this._post.model.post.findUnique({
      where: {
        id,
        ...(org ? { organizationId: org } : {}),
      },
      include: {
        integration: true,
        submittedForOrder: {
          include: {
            posts: {
              where: {
                state: 'PUBLISHED',
              },
            },
            ordersItems: true,
            seller: {
              select: {
                id: true,
                account: true,
              },
            },
          },
        },
      },
    });
  }

  findAllExistingCategories() {
    return this._popularPosts.model.popularPosts.findMany({
      select: {
        category: true,
      },
      distinct: ['category'],
    });
  }

  findAllExistingTopicsOfCategory(category: string) {
    return this._popularPosts.model.popularPosts.findMany({
      where: {
        category,
      },
      select: {
        topic: true,
      },
      distinct: ['topic'],
    });
  }

  findPopularPosts(category: string, topic?: string) {
    return this._popularPosts.model.popularPosts.findMany({
      where: {
        category,
        ...(topic ? { topic } : {}),
      },
      select: {
        content: true,
        hook: true,
      },
    });
  }

  createPopularPosts(post: {
    category: string;
    topic: string;
    content: string;
    hook: string;
  }) {
    return this._popularPosts.model.popularPosts.create({
      data: {
        category: 'category',
        topic: 'topic',
        content: 'content',
        hook: 'hook',
      },
    });
  }

  async getPostsCountsByDates(
    orgId: string,
    times: number[],
    date: dayjs.Dayjs
  ) {
    const dates = await this._post.model.post.findMany({
      where: {
        deletedAt: null,
        organizationId: orgId,
        publishDate: {
          in: times.map((time) => {
            return date.clone().add(time, 'minutes').toDate();
          }),
        },
      },
    });

    return times.filter(
      (time) =>
        date.clone().add(time, 'minutes').isAfter(dayjs.utc()) &&
        !dates.find((dateFind) => {
          return (
            dayjs
              .utc(dateFind.publishDate)
              .diff(date.clone().startOf('day'), 'minutes') == time
          );
        })
    );
  }

  async getComments(postId: string) {
    return this._comments.model.comments.findMany({
      where: {
        postId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getTags(orgId: string) {
    return this._tags.model.tags.findMany({
      where: {
        orgId,
      },
    });
  }

  createTag(orgId: string, body: CreateTagDto) {
    return this._tags.model.tags.create({
      data: {
        orgId,
        name: body.name,
        color: body.color,
      },
    });
  }

  editTag(id: string, orgId: string, body: CreateTagDto) {
    return this._tags.model.tags.update({
      where: {
        id,
      },
      data: {
        name: body.name,
        color: body.color,
      },
    });
  }

  createComment(
    orgId: string,
    userId: string,
    postId: string,
    content: string
  ) {
    return this._comments.model.comments.create({
      data: {
        organizationId: orgId,
        userId,
        postId,
        content,
      },
    });
  }

  async getPostsSince(orgId: string, since: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        publishDate: {
          gte: new Date(since),
        },
        deletedAt: null,
        parentPostId: null,
      },
      select: {
        id: true,
        content: true,
        publishDate: true,
        releaseURL: true,
        state: true,
        integration: {
          select: {
            id: true,
            name: true,
            providerIdentifier: true,
            picture: true,
            type: true,
          },
        },
      },
    });
  }
}
