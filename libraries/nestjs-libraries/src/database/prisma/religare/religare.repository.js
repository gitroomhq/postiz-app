"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReligareRepository = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@gitroom/nestjs-libraries/database/prisma/prisma.service");
const PROFILE_LIST_SELECT = {
    id: true,
    expertId: true,
    name: true,
    status: true,
    kinNatal: true,
    kinData: true,
    archetypePrimary: true,
    archetypeSecondary: true,
    createdAt: true,
    updatedAt: true,
    expert: { select: { id: true, name: true, avatarUrl: true, handle: true } },
};
const PROFILE_DETAIL_SELECT = Object.assign(Object.assign({}, PROFILE_LIST_SELECT), { birthDate: true, birthTime: true, birthPlace: true, birthLat: true, birthLng: true, birthTz: true, answers: true, archetypeScores: true, vocational: true, synthesis: true, astrology: true, dna: true, humanDesign: true, brandProfile: true, shareToken: true });
let ReligareRepository = class ReligareRepository {
    constructor(_profile, _org) {
        this._profile = _profile;
        this._org = _org;
    }
    getContext(orgId) {
        return this._org.model.organization.findUnique({
            where: { id: orgId },
            select: { religareContext: true },
        });
    }
    setContext(orgId, context) {
        return this._org.model.organization.update({
            where: { id: orgId },
            data: { religareContext: context },
            select: { religareContext: true },
        });
    }
    listProfiles(orgId, search, page = 0) {
        const PAGE_SIZE = 20;
        return this._profile.model.religareProfile.findMany({
            where: Object.assign({ orgId, deletedAt: null }, (search
                ? { name: { contains: search, mode: 'insensitive' } }
                : {})),
            select: PROFILE_LIST_SELECT,
            orderBy: { createdAt: 'desc' },
            skip: page * PAGE_SIZE,
            take: PAGE_SIZE,
        });
    }
    countProfiles(orgId) {
        return this._profile.model.religareProfile.count({
            where: { orgId, deletedAt: null },
        });
    }
    getProfileById(orgId, id) {
        return this._profile.model.religareProfile.findFirst({
            where: { id, orgId, deletedAt: null },
            select: PROFILE_DETAIL_SELECT,
        });
    }
    getProfileByExpert(orgId, expertId) {
        return this._profile.model.religareProfile.findFirst({
            where: { expertId, orgId, deletedAt: null },
            select: PROFILE_DETAIL_SELECT,
        });
    }
    createProfile(orgId, data) {
        const { birthDate } = data, rest = tslib_1.__rest(data, ["birthDate"]);
        return this._profile.model.religareProfile.create({
            data: Object.assign(Object.assign({ orgId }, rest), { birthDate: birthDate ? new Date(birthDate) : null }),
            select: PROFILE_DETAIL_SELECT,
        });
    }
    updateProfile(id, data) {
        const { birthDate, brandProfile } = data, rest = tslib_1.__rest(data, ["birthDate", "brandProfile"]);
        return this._profile.model.religareProfile.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign({}, rest), (birthDate !== undefined
                ? { birthDate: birthDate ? new Date(birthDate) : null }
                : {})), (brandProfile !== undefined
                ? { brandProfile: brandProfile }
                : {})),
            select: PROFILE_DETAIL_SELECT,
        });
    }
    saveQuestionnaireResults(id, results) {
        return this._profile.model.religareProfile.update({
            where: { id },
            data: Object.assign(Object.assign({}, results), { status: 'COMPLETE' }),
            select: PROFILE_DETAIL_SELECT,
        });
    }
    softDeleteProfile(id) {
        return this._profile.model.religareProfile.update({
            where: { id },
            data: { deletedAt: new Date() },
            select: { id: true },
        });
    }
    profileBelongsToOrg(orgId, id) {
        return this._profile.model.religareProfile.findFirst({
            where: { id, orgId, deletedAt: null },
            select: { id: true },
        });
    }
};
exports.ReligareRepository = ReligareRepository;
exports.ReligareRepository = ReligareRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [prisma_service_1.PrismaRepository,
        prisma_service_1.PrismaRepository])
], ReligareRepository);
//# sourceMappingURL=religare.repository.js.map