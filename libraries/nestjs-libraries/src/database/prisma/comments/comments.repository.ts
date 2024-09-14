import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { groupBy } from 'lodash';

@Injectable()
export class CommentsRepository {
  constructor(private _media: PrismaRepository<'comments'>) {}

  addAComment(orgId: string, userId: string, comment: string, date: string) {
    return this._media.model.comments.create({
      data: {
        organizationId: orgId,
        userId: userId,
        content: comment,
        date: dayjs(date).toDate(),
      },
      select: {
        id: true,
      },
    });
  }

  addACommentToComment(
    orgId: string,
    userId: string,
    commentId: string,
    comment: string,
    date: string
  ) {
    return this._media.model.comments.create({
      data: {
        organizationId: orgId,
        userId: userId,
        content: comment,
        date: dayjs(date).toDate(),
        parentCommentId: commentId,
      },
      select: {
        id: true,
      },
    });
  }

  updateAComment(
    orgId: string,
    userId: string,
    commentId: string,
    comment: string
  ) {
    return this._media.model.comments.update({
      where: {
        id: commentId,
        organizationId: orgId,
        userId: userId,
      },
      data: {
        content: comment,
      },
    });
  }

  deleteAComment(orgId: string, userId: string, commentId: string) {
    return this._media.model.comments.update({
      where: {
        id: commentId,
        organizationId: orgId,
        userId: userId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async loadAllCommentsAndSubCommentsForADate(orgId: string, date: string) {
    return this._media.model.comments.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        date: dayjs(date).toDate(),
        parentCommentId: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        content: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        childrenComment: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async getAllCommentsByWeekYear(
    orgId: string,
    year: number,
    week: number,
  ) {
    const dateYear = dayjs().year(year);
    const date = dateYear.isoWeek(week);
    const startDate = date.startOf('isoWeek').subtract(2, 'days').toDate();
    const endDate = date.endOf('isoWeek').add(2, 'days').toDate();

    const load = await this._media.model.comments.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        parentCommentId: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        _count: {
          select: {
            childrenComment: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    const group = groupBy(load, (item) =>
      dayjs(item.date).format('YYYY-MM-DD HH:MM')
    );

    return Object.values(group).reduce((all, current) => {
      return [
        ...all,
        {
          date: current[0].date,
          total:
            current.length +
            current.reduce(
              (all2, current2) => all2 + current2._count.childrenComment,
              0
            ),
        },
      ];
    }, [] as Array<{ date: Date; total: number }>);
  }
}
