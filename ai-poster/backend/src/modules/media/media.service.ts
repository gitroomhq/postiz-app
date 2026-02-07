import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database.module';
import { MediaType } from '@prisma/client';

const MIME_TO_TYPE: Record<string, MediaType> = {
  'image/jpeg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/gif': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,
  'image/svg+xml': MediaType.IMAGE,
  'video/mp4': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,
  'video/webm': MediaType.VIDEO,
  'video/x-msvideo': MediaType.VIDEO,
  'application/pdf': MediaType.DOCUMENT,
  'application/msword': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    MediaType.DOCUMENT,
  'text/plain': MediaType.DOCUMENT,
};

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    options: {
      type?: MediaType;
      page: number;
      limit: number;
    },
  ) {
    const { type, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async upload(organizationId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const mediaType = MIME_TO_TYPE[file.mimetype];
    if (!mediaType) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const media = await this.prisma.media.create({
      data: {
        organizationId,
        name: file.originalname,
        path: file.filename,
        type: mediaType,
        fileSize: file.size,
        mimeType: file.mimetype,
        aiGenerated: false,
      },
    });

    return media;
  }

  async softDelete(organizationId: string, id: string) {
    const media = await this.prisma.media.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    await this.prisma.media.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Create a media record from an AI-generated image URL.
   * Called internally by AI service after generating an image.
   */
  async createFromUrl(
    organizationId: string,
    data: {
      name: string;
      path: string;
      type: MediaType;
      fileSize: number;
      mimeType: string;
      aiGenerated: boolean;
    },
  ) {
    return this.prisma.media.create({
      data: {
        organizationId,
        ...data,
      },
    });
  }
}
