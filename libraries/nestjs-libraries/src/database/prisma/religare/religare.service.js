"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReligareService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const religare_repository_1 = require("./religare.repository");
const religare_limits_1 = require("./religare-limits");
const religare_geocode_1 = require("./religare-geocode");
const religare_1 = require("@gitroom/helpers/utils/religare");
const astrology_1 = require("@gitroom/helpers/utils/religare/astrology");
const hd_1 = require("@gitroom/helpers/utils/religare/hd");
let ReligareService = class ReligareService {
    constructor(_religareRepository) {
        this._religareRepository = _religareRepository;
    }
    async listProfiles(orgId, search, page) {
        const pageNum = Math.max(0, parseInt(page || '0', 10) || 0);
        const [items, total] = await Promise.all([
            this._religareRepository.listProfiles(orgId, search, pageNum),
            this._religareRepository.countProfiles(orgId),
        ]);
        return { items, total, page: pageNum };
    }
    async getProfile(orgId, id) {
        const profile = await this._religareRepository.getProfileById(orgId, id);
        if (!profile)
            throw new common_1.NotFoundException('Perfil Religare não encontrado');
        return profile;
    }
    getProfileByExpert(orgId, expertId) {
        return this._religareRepository.getProfileByExpert(orgId, expertId);
    }
    async createProfile(orgId, dto, tier) {
        const count = await this._religareRepository.countProfiles(orgId);
        const limit = (0, religare_limits_1.religareProfileLimit)(tier);
        if (count >= limit) {
            throw new common_1.ForbiddenException(`Seu plano permite até ${limit} perfil(is) Religare. Faça upgrade para criar mais.`);
        }
        return this._religareRepository.createProfile(orgId, dto);
    }
    async updateProfile(orgId, id, dto) {
        await this._assertProfileExists(orgId, id);
        return this._religareRepository.updateProfile(id, dto);
    }
    async deleteProfile(orgId, id) {
        await this._assertProfileExists(orgId, id);
        return this._religareRepository.softDeleteProfile(id);
    }
    async submitQuestionnaire(orgId, id, dto) {
        const profile = await this._religareRepository.getProfileById(orgId, id);
        if (!profile)
            throw new common_1.NotFoundException('Perfil Religare não encontrado');
        return this._computeAndPersist(profile, dto.answers);
    }
    async recompute(orgId, id) {
        const profile = await this._religareRepository.getProfileById(orgId, id);
        if (!profile)
            throw new common_1.NotFoundException('Perfil Religare não encontrado');
        const answers = profile.answers || {
            archetypes: {},
            vocational: {},
            ikigai: { loves: '', goodAt: '', worldNeeds: '', paidFor: '' },
        };
        return this._computeAndPersist(profile, answers);
    }
    async _computeAndPersist(profile, answers) {
        var _a, _b, _c, _d;
        const archetypes = (0, religare_1.scoreArchetypes)(answers.archetypes || {});
        const vocational = (0, religare_1.scoreVocational)(answers.vocational || {}, answers.ikigai);
        const birth = profile.birthDate ? new Date(profile.birthDate) : null;
        const kin = birth ? (0, religare_1.kinForDate)(birth) : null;
        const moon = birth ? (0, religare_1.getMoonPhase)(birth) : null;
        let birthLat = (_a = profile.birthLat) !== null && _a !== void 0 ? _a : null;
        let birthLng = (_b = profile.birthLng) !== null && _b !== void 0 ? _b : null;
        let birthTz = (_c = profile.birthTz) !== null && _c !== void 0 ? _c : null;
        if ((birthLat == null || birthLng == null) && profile.birthPlace) {
            const geo = await (0, religare_geocode_1.geocodePlace)(profile.birthPlace);
            if (geo) {
                birthLat = geo.lat;
                birthLng = geo.lng;
                birthTz = geo.ianaTz;
            }
        }
        let astrology = null;
        try {
            if (birthLat != null &&
                birthLng != null &&
                profile.birthDate &&
                profile.birthTime) {
                astrology = (0, astrology_1.computeNatalChart)({
                    birthDate: new Date(profile.birthDate).toISOString().slice(0, 10),
                    birthTime: profile.birthTime,
                    latitude: birthLat,
                    longitude: birthLng,
                    ianaTz: birthTz || 'UTC',
                });
            }
        }
        catch (_e) {
            astrology = null;
        }
        let humanDesign = null;
        try {
            if (birthLat != null &&
                birthLng != null &&
                profile.birthDate &&
                profile.birthTime) {
                humanDesign = (0, hd_1.computeHumanDesign)({
                    birthDate: new Date(profile.birthDate).toISOString().slice(0, 10),
                    birthTime: profile.birthTime,
                    latitude: birthLat,
                    longitude: birthLng,
                    ianaTz: birthTz || 'UTC',
                });
            }
        }
        catch (_f) {
            humanDesign = null;
        }
        const synthesis = (0, religare_1.buildSynthesis)({
            name: profile.name,
            kin,
            moon,
            archetypes,
            vocational,
        });
        const dna = (0, religare_1.buildDNA)({
            name: profile.name,
            kin,
            moon,
            astrology,
            archetypes,
            vocational,
            humanDesign,
        });
        return this._religareRepository.saveQuestionnaireResults(profile.id, {
            answers: answers,
            kinNatal: (_d = kin === null || kin === void 0 ? void 0 : kin.kin) !== null && _d !== void 0 ? _d : null,
            kinData: (kin !== null && kin !== void 0 ? kin : {}),
            archetypePrimary: archetypes.primary,
            archetypeSecondary: archetypes.secondary,
            archetypeScores: archetypes.scores,
            vocational: vocational,
            synthesis,
            astrology: (astrology !== null && astrology !== void 0 ? astrology : client_1.Prisma.JsonNull),
            dna: (dna !== null && dna !== void 0 ? dna : client_1.Prisma.JsonNull),
            humanDesign: (humanDesign !== null && humanDesign !== void 0 ? humanDesign : client_1.Prisma.JsonNull),
            birthLat,
            birthLng,
            birthTz,
        });
    }
    async getContext(orgId) {
        const org = await this._religareRepository.getContext(orgId);
        const context = (org === null || org === void 0 ? void 0 : org.religareContext) || 'agency';
        return { context };
    }
    async setContext(orgId, context) {
        await this._religareRepository.setContext(orgId, context);
        return { context };
    }
    async _assertProfileExists(orgId, id) {
        const exists = await this._religareRepository.profileBelongsToOrg(orgId, id);
        if (!exists)
            throw new common_1.NotFoundException('Perfil Religare não encontrado');
    }
};
exports.ReligareService = ReligareService;
exports.ReligareService = ReligareService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [religare_repository_1.ReligareRepository])
], ReligareService);
//# sourceMappingURL=religare.service.js.map