import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
let MediaRepository = class MediaRepository {
    constructor(_media) {
        this._media = _media;
    }
    saveFile(org, fileName, filePath, originalName) {
        return this._media.model.media.create({
            data: {
                organization: {
                    connect: {
                        id: org,
                    },
                },
                name: fileName,
                path: filePath,
                originalName: originalName || null,
            },
            select: {
                id: true,
                name: true,
                originalName: true,
                path: true,
                thumbnail: true,
                alt: true,
            },
        });
    }
    getMediaById(id) {
        return this._media.model.media.findUnique({
            where: {
                id,
            },
        });
    }
    deleteMedia(org, id) {
        return this._media.model.media.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    saveMediaInformation(org, data) {
        return this._media.model.media.update({
            where: {
                id: data.id,
                organizationId: org,
            },
            data: {
                alt: data.alt,
                thumbnail: data.thumbnail,
                thumbnailTimestamp: data.thumbnailTimestamp,
            },
            select: {
                id: true,
                name: true,
                originalName: true,
                alt: true,
                thumbnail: true,
                path: true,
                thumbnailTimestamp: true,
            },
        });
    }
    getMedia(org, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const pageNum = (page || 1) - 1;
            const query = {
                where: {
                    organization: {
                        id: org,
                    },
                },
            };
            const pages = Math.ceil((yield this._media.model.media.count(query)) / 18);
            const results = yield this._media.model.media.findMany({
                where: {
                    organizationId: org,
                    deletedAt: null,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    id: true,
                    name: true,
                    originalName: true,
                    path: true,
                    thumbnail: true,
                    alt: true,
                    thumbnailTimestamp: true,
                },
                skip: pageNum * 18,
                take: 18,
            });
            return {
                pages,
                results,
            };
        });
    }
};
MediaRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository])
], MediaRepository);
export { MediaRepository };
//# sourceMappingURL=media.repository.js.map