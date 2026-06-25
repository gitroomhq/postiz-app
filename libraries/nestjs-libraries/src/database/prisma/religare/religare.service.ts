import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionTier } from '@prisma/client';
import { ReligareRepository } from './religare.repository';
import { religareProfileLimit } from './religare-limits';
import { geocodePlace } from './religare-geocode';
import {
  CreateReligareProfileDto,
  ReligareContext,
  SubmitQuestionnaireDto,
  UpdateReligareProfileDto,
} from '@gitroom/nestjs-libraries/dtos/religare/profile.dto';
import {
  AstrologyResult,
  ArchetypeResult,
  buildDNA,
  buildSynthesis,
  getMoonPhase,
  HumanDesignResult,
  kinForDate,
  QuestionnaireAnswers,
  scoreArchetypes,
  scoreVocational,
  VocationalResult,
} from '@gitroom/helpers/utils/religare';
// Natal/HD calc imported by subpath: they pull the ephemeris lib and must stay
// out of the barrel (and the frontend bundle).
import { computeNatalChart } from '@gitroom/helpers/utils/religare/astrology';
import { computeHumanDesign } from '@gitroom/helpers/utils/religare/hd';

@Injectable()
export class ReligareService {
  constructor(private _religareRepository: ReligareRepository) {}

  async listProfiles(orgId: string, search?: string, page?: string) {
    const pageNum = Math.max(0, parseInt(page || '0', 10) || 0);
    const [items, total] = await Promise.all([
      this._religareRepository.listProfiles(orgId, search, pageNum),
      this._religareRepository.countProfiles(orgId),
    ]);
    return { items, total, page: pageNum };
  }

  async getProfile(orgId: string, id: string) {
    const profile = await this._religareRepository.getProfileById(orgId, id);
    if (!profile) throw new NotFoundException('Perfil Religare não encontrado');
    return profile;
  }

  getProfileByExpert(orgId: string, expertId: string) {
    return this._religareRepository.getProfileByExpert(orgId, expertId);
  }

  async createProfile(
    orgId: string,
    dto: CreateReligareProfileDto,
    tier?: SubscriptionTier | null,
    isSuperAdmin?: boolean
  ) {
    const count = await this._religareRepository.countProfiles(orgId);
    const limit = religareProfileLimit(tier);
    if (!isSuperAdmin && count >= limit) {
      throw new ForbiddenException(
        `Seu plano permite até ${limit} perfil(is) Religare. Faça upgrade para criar mais.`
      );
    }
    return this._religareRepository.createProfile(orgId, dto);
  }

  async updateProfile(orgId: string, id: string, dto: UpdateReligareProfileDto) {
    await this._assertProfileExists(orgId, id);
    return this._religareRepository.updateProfile(id, dto);
  }

  async deleteProfile(orgId: string, id: string) {
    await this._assertProfileExists(orgId, id);
    return this._religareRepository.softDeleteProfile(id);
  }

  /** Computa arquétipos + vocacional + kin + astrologia + DNA e salva. */
  async submitQuestionnaire(
    orgId: string,
    id: string,
    dto: SubmitQuestionnaireDto
  ) {
    const profile = await this._religareRepository.getProfileById(orgId, id);
    if (!profile) throw new NotFoundException('Perfil Religare não encontrado');
    return this._computeAndPersist(profile, dto.answers);
  }

  /**
   * Recomputa tudo (inclui geocoding se faltarem coords) a partir das respostas
   * já salvas. Cobre perfis antigos sem astrologia e o botão "Recalcular".
   */
  async recompute(orgId: string, id: string) {
    const profile = await this._religareRepository.getProfileById(orgId, id);
    if (!profile) throw new NotFoundException('Perfil Religare não encontrado');
    const answers = (profile.answers as unknown as QuestionnaireAnswers) || {
      archetypes: {},
      vocational: {},
      ikigai: { loves: '', goodAt: '', worldNeeds: '', paidFor: '' },
    };
    return this._computeAndPersist(profile, answers);
  }

  /** Núcleo de cálculo compartilhado por submit + recompute. */
  private async _computeAndPersist(
    profile: { id: string } & Record<string, any>,
    answers: QuestionnaireAnswers
  ) {
    const archetypes: ArchetypeResult = scoreArchetypes(answers.archetypes || {});
    const vocational: VocationalResult = scoreVocational(
      answers.vocational || {},
      answers.ikigai
    );
    const birth = profile.birthDate ? new Date(profile.birthDate) : null;
    const kin = birth ? kinForDate(birth) : null;
    const moon = birth ? getMoonPhase(birth) : null;

    // Coords: geocode once if missing; persisted so a future API outage is safe.
    let birthLat: number | null = profile.birthLat ?? null;
    let birthLng: number | null = profile.birthLng ?? null;
    let birthTz: string | null = profile.birthTz ?? null;
    if ((birthLat == null || birthLng == null) && profile.birthPlace) {
      const geo = await geocodePlace(profile.birthPlace);
      if (geo) {
        birthLat = geo.lat;
        birthLng = geo.lng;
        birthTz = geo.ianaTz;
      }
    }

    // Astrology — defensive: a bad birth date must not break the whole save.
    let astrology: AstrologyResult | null = null;
    try {
      if (
        birthLat != null &&
        birthLng != null &&
        profile.birthDate &&
        profile.birthTime
      ) {
        astrology = computeNatalChart({
          birthDate: new Date(profile.birthDate).toISOString().slice(0, 10),
          birthTime: profile.birthTime,
          latitude: birthLat,
          longitude: birthLng,
          ianaTz: birthTz || 'UTC',
        });
      }
    } catch {
      astrology = null;
    }

    // Human Design — same defensive posture; reuses the coords already
    // resolved above, no new external call.
    let humanDesign: HumanDesignResult | null = null;
    try {
      if (
        birthLat != null &&
        birthLng != null &&
        profile.birthDate &&
        profile.birthTime
      ) {
        humanDesign = computeHumanDesign({
          birthDate: new Date(profile.birthDate).toISOString().slice(0, 10),
          birthTime: profile.birthTime,
          latitude: birthLat,
          longitude: birthLng,
          ianaTz: birthTz || 'UTC',
        });
      }
    } catch {
      humanDesign = null;
    }

    const synthesis = buildSynthesis({
      name: profile.name,
      kin,
      moon,
      archetypes,
      vocational,
    });
    const dna = buildDNA({
      name: profile.name,
      kin,
      moon,
      astrology,
      archetypes,
      vocational,
      humanDesign,
    });

    return this._religareRepository.saveQuestionnaireResults(profile.id, {
      answers: answers as unknown as Prisma.InputJsonValue,
      kinNatal: kin?.kin ?? null,
      kinData: (kin ?? {}) as unknown as Prisma.InputJsonValue,
      archetypePrimary: archetypes.primary,
      archetypeSecondary: archetypes.secondary,
      archetypeScores: archetypes.scores as unknown as Prisma.InputJsonValue,
      vocational: vocational as unknown as Prisma.InputJsonValue,
      synthesis,
      astrology: (astrology ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      dna: (dna ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      humanDesign: (humanDesign ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      birthLat,
      birthLng,
      birthTz,
    });
  }

  async getContext(orgId: string): Promise<{ context: ReligareContext }> {
    const org = await this._religareRepository.getContext(orgId);
    const context = (org?.religareContext as ReligareContext) || 'agency';
    return { context };
  }

  async setContext(orgId: string, context: ReligareContext) {
    await this._religareRepository.setContext(orgId, context);
    return { context };
  }

  private async _assertProfileExists(orgId: string, id: string) {
    const exists = await this._religareRepository.profileBelongsToOrg(orgId, id);
    if (!exists) throw new NotFoundException('Perfil Religare não encontrado');
  }
}
