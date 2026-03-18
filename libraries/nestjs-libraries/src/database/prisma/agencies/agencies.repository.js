import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
let AgenciesRepository = class AgenciesRepository {
    constructor(_socialMediaAgencies, _socialMediaAgenciesNiche) {
        this._socialMediaAgencies = _socialMediaAgencies;
        this._socialMediaAgenciesNiche = _socialMediaAgenciesNiche;
    }
    getAllAgencies() {
        return this._socialMediaAgencies.model.socialMediaAgency.findMany({
            where: {
                deletedAt: null,
                approved: true,
            },
            include: {
                logo: true,
                niches: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    getCount() {
        return this._socialMediaAgencies.model.socialMediaAgency.count({
            where: {
                deletedAt: null,
                approved: true,
            },
        });
    }
    getAllAgenciesSlug() {
        return this._socialMediaAgencies.model.socialMediaAgency.findMany({
            where: {
                deletedAt: null,
                approved: true,
            },
            select: {
                slug: true,
            },
        });
    }
    approveOrDecline(action, id) {
        return this._socialMediaAgencies.model.socialMediaAgency.update({
            where: {
                id,
            },
            data: {
                approved: action === 'approve',
            },
        });
    }
    getAgencyById(id) {
        return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
            where: {
                id,
                deletedAt: null,
                approved: true,
            },
            include: {
                logo: true,
                niches: true,
                user: true,
            },
        });
    }
    getAgencyInformation(agency) {
        return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
            where: {
                slug: agency,
                deletedAt: null,
                approved: true,
            },
            include: {
                logo: true,
                niches: true,
            },
        });
    }
    getAgencyByUser(user) {
        return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
            where: {
                userId: user.id,
                deletedAt: null,
            },
            include: {
                logo: true,
                niches: true,
            },
        });
    }
    createAgency(user, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const insertAgency = yield this._socialMediaAgencies.model.socialMediaAgency.upsert({
                where: {
                    userId: user.id,
                },
                update: {
                    userId: user.id,
                    name: body.name,
                    website: body.website,
                    facebook: body.facebook,
                    instagram: body.instagram,
                    twitter: body.twitter,
                    linkedIn: body.linkedIn,
                    youtube: body.youtube,
                    tiktok: body.tiktok,
                    logoId: body.logo.id,
                    shortDescription: body.shortDescription,
                    description: body.description,
                    approved: false,
                },
                create: {
                    userId: user.id,
                    name: body.name,
                    website: body.website,
                    facebook: body.facebook,
                    instagram: body.instagram,
                    twitter: body.twitter,
                    linkedIn: body.linkedIn,
                    youtube: body.youtube,
                    tiktok: body.tiktok,
                    logoId: body.logo.id,
                    shortDescription: body.shortDescription,
                    description: body.description,
                    slug: body.name.toLowerCase().replace(/ /g, '-'),
                    approved: false,
                },
                select: {
                    id: true,
                },
            });
            yield this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.deleteMany({
                where: {
                    agencyId: insertAgency.id,
                    niche: {
                        notIn: body.niches,
                    },
                },
            });
            const currentNiche = yield this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.findMany({
                where: {
                    agencyId: insertAgency.id,
                },
                select: {
                    niche: true,
                },
            });
            const addNewNiche = body.niches.filter((n) => !currentNiche.some((c) => c.niche === n));
            yield this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.createMany({
                data: addNewNiche.map((n) => ({
                    agencyId: insertAgency.id,
                    niche: n,
                })),
            });
            return insertAgency;
        });
    }
};
AgenciesRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository,
        PrismaRepository])
], AgenciesRepository);
export { AgenciesRepository };
//# sourceMappingURL=agencies.repository.js.map