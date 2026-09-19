import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClippingRepository {
  constructor(
    private _clipping: PrismaRepository<'clipping'>,
    private _clippingClip: PrismaRepository<'clippingClip'>,
    private _transaction: PrismaTransaction
  ) {}

  createClipping(
    org: string,
    url: string,
    maxClips: number,
    fit: 'crop' | 'blur',
    integrations: string[]
  ) {
    return this._clipping.model.clipping.create({
      data: {
        organizationId: org,
        url,
        maxClips,
        fit,
        integrations: JSON.stringify(integrations),
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  getRunningClippings(org: string) {
    return this._clipping.model.clipping.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        status: {
          notIn: ['completed', 'failed'],
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
  }

  countClippingsSince(org: string, since: Date) {
    return this._clipping.model.clipping.count({
      where: {
        organizationId: org,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  getClippingById(id: string) {
    return this._clipping.model.clipping.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        clips: {
          orderBy: {
            start: 'asc',
          },
        },
      },
    });
  }

  getClipping(org: string, id: string) {
    return this._clipping.model.clipping.findFirst({
      where: {
        id,
        organizationId: org,
        deletedAt: null,
      },
      select: {
        id: true,
        url: true,
        status: true,
        error: true,
        title: true,
        thumbnail: true,
        duration: true,
        createdAt: true,
        clips: {
          orderBy: {
            start: 'asc',
          },
          select: {
            id: true,
            title: true,
            content: true,
            start: true,
            end: true,
            status: true,
            error: true,
            mediaId: true,
            path: true,
            thumbnail: true,
          },
        },
      },
    });
  }

  // Only what the widget shows and reports: the ticket travels in a query
  // string, so the route gives away as little as it can
  getClippingProgress(org: string, id: string) {
    return this._clipping.model.clipping.findFirst({
      where: {
        id,
        organizationId: org,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        error: true,
        title: true,
        clips: {
          orderBy: {
            start: 'asc',
          },
          select: {
            id: true,
            title: true,
            status: true,
            error: true,
            mediaId: true,
            path: true,
            thumbnail: true,
          },
        },
      },
    });
  }

  async getClippings(org: string, page: number) {
    const pageNum = Math.max(+page || 1, 1) - 1;
    const where = {
      organizationId: org,
      deletedAt: null as null,
    };

    const pages = Math.ceil(
      (await this._clipping.model.clipping.count({ where })) / 20
    );

    const results = await this._clipping.model.clipping.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        url: true,
        status: true,
        error: true,
        title: true,
        thumbnail: true,
        duration: true,
        createdAt: true,
      },
      skip: pageNum * 20,
      take: 20,
    });

    return {
      pages,
      results,
    };
  }

  updateClipping(
    org: string,
    id: string,
    data: {
      status?: string;
      error?: string | null;
      title?: string;
      thumbnail?: string;
      duration?: number;
      creditsId?: string | null;
    }
  ) {
    return this._clipping.model.clipping.update({
      where: {
        id,
        organizationId: org,
      },
      data,
      select: {
        id: true,
        status: true,
      },
    });
  }

  // In one transaction with a look at what is there: an attempt that timed out
  // can still be running when its retry gets here, and only one may store clips
  createClips(
    clippingId: string,
    clips: { title: string; content: string; start: number; end: number }[]
  ) {
    return this._transaction.model.$transaction(async (tx) => {
      const select = { where: { clippingId }, select: { id: true } };
      const existing = await tx.clippingClip.findMany(select);
      if (existing.length) {
        return existing;
      }

      await tx.clippingClip.createMany({
        data: clips.map((clip) => ({
          clippingId,
          ...clip,
        })),
      });

      return tx.clippingClip.findMany(select);
    });
  }

  failUnfinishedClips(clippingId: string, error: string) {
    return this._clippingClip.model.clippingClip.updateMany({
      where: {
        clippingId,
        status: 'pending',
      },
      data: {
        status: 'failed',
        error,
      },
    });
  }

  getClipById(id: string) {
    return this._clippingClip.model.clippingClip.findUnique({
      where: {
        id,
      },
      include: {
        clipping: true,
      },
    });
  }

  updateClip(
    id: string,
    data: {
      status?: string;
      error?: string | null;
      trimStart?: number;
      mediaId?: string;
      path?: string;
      thumbnail?: string;
      draftedAt?: Date;
    }
  ) {
    return this._clippingClip.model.clippingClip.update({
      where: {
        id,
      },
      data,
      select: {
        id: true,
        status: true,
      },
    });
  }
}
