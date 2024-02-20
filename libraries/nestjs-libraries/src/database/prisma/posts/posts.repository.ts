import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Post as PostBody } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import { Integration, Post } from '@prisma/client';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { v4 as uuidv4 } from 'uuid';
import {instanceToInstance, instanceToPlain} from "class-transformer";
import {validate} from "class-validator";

dayjs.extend(isoWeek);

@Injectable()
export class PostsRepository {
  constructor(private _post: PrismaRepository<'post'>) {}

  getPosts(orgId: string, query: GetPostsDto) {
    const date = dayjs().year(query.year).isoWeek(query.week);

    const startDate = date.startOf('isoWeek').toDate();
    const endDate = date.endOf('isoWeek').toDate();

    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        publishDate: {
          gte: startDate,
          lte: endDate,
        },
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
            providerIdentifier: true,
          },
        },
      },
    });
  }

  getPost(id: string, includeIntegration = false, orgId?: string) {
    return this._post.model.post.findUnique({
      where: {
        id,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: {
        ...(includeIntegration ? { integration: true } : {}),
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

  async createOrUpdatePost(orgId: string, date: string, body: PostBody) {
    const posts: Post[] = [];

    for (const value of body.value) {
      const updateData = {
        publishDate: dayjs(date).toDate(),
        integration: {
          connect: {
            id: body.integration.id,
            organizationId: orgId,
          },
        },
        ...(posts.length
          ? {
              parentPost: {
                connect: {
                  id: posts[posts.length - 1]?.id,
                },
              },
            }
          : {}),
        content: value.content,
        settings: JSON.stringify(body.settings),
        organization: {
          connect: {
            id: orgId,
          },
        },
      };


      posts.push(
        await this._post.model.post.upsert({
          where: {
            id: value.id || uuidv4()
          },
          create: updateData,
          update: updateData,
        })
      );
    }

    return posts;
  }
}
