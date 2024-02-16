import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Post as PostBody } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import dayjs from 'dayjs';
import { Integration, Post } from '@prisma/client';

@Injectable()
export class PostsRepository {
  constructor(private _post: PrismaRepository<'post'>) {}

  getPost(id: string, includeIntegration = false) {
    return this._post.model.post.findUnique({
      where: {
        id,
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

  async createPost(orgId: string, date: string, body: PostBody) {
    const posts: Post[] = [];
    for (const value of body.value) {
      posts.push(
        await this._post.model.post.create({
          data: {
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
            content: value,
            organization: {
              connect: {
                id: orgId,
              },
            },
          },
        })
      );
    }

    return posts;
  }
}
