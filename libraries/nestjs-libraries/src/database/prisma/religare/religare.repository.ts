import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  CreateReligareProfileDto,
  UpdateReligareProfileDto,
} from '@gitroom/nestjs-libraries/dtos/religare/profile.dto';

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
} as const;

const PROFILE_DETAIL_SELECT = {
  ...PROFILE_LIST_SELECT,
  birthDate: true,
  birthTime: true,
  birthPlace: true,
  birthLat: true,
  birthLng: true,
  birthTz: true,
  answers: true,
  archetypeScores: true,
  vocational: true,
  synthesis: true,
  astrology: true,
  dna: true,
  humanDesign: true,
  brandProfile: true,
} as const;

@Injectable()
export class ReligareRepository {
  constructor(
    private _profile: PrismaRepository<'religareProfile'>,
    private _org: PrismaRepository<'organization'>
  ) {}

  getContext(orgId: string) {
    return this._org.model.organization.findUnique({
      where: { id: orgId },
      select: { religareContext: true },
    });
  }

  setContext(orgId: string, context: string) {
    return this._org.model.organization.update({
      where: { id: orgId },
      data: { religareContext: context },
      select: { religareContext: true },
    });
  }

  listProfiles(orgId: string, search?: string, page = 0) {
    const PAGE_SIZE = 20;
    return this._profile.model.religareProfile.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      select: PROFILE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  countProfiles(orgId: string) {
    return this._profile.model.religareProfile.count({
      where: { orgId, deletedAt: null },
    });
  }

  getProfileById(orgId: string, id: string) {
    return this._profile.model.religareProfile.findFirst({
      where: { id, orgId, deletedAt: null },
      select: PROFILE_DETAIL_SELECT,
    });
  }

  getProfileByExpert(orgId: string, expertId: string) {
    return this._profile.model.religareProfile.findFirst({
      where: { expertId, orgId, deletedAt: null },
      select: PROFILE_DETAIL_SELECT,
    });
  }

  createProfile(orgId: string, data: CreateReligareProfileDto) {
    const { birthDate, ...rest } = data;
    return this._profile.model.religareProfile.create({
      data: {
        orgId,
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
      select: PROFILE_DETAIL_SELECT,
    });
  }

  updateProfile(id: string, data: UpdateReligareProfileDto) {
    const { birthDate, brandProfile, ...rest } = data;
    return this._profile.model.religareProfile.update({
      where: { id },
      data: {
        ...rest,
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
        ...(brandProfile !== undefined
          ? { brandProfile: brandProfile as Prisma.InputJsonValue }
          : {}),
      },
      select: PROFILE_DETAIL_SELECT,
    });
  }

  /** Grava os resultados computados dos questionários. */
  saveQuestionnaireResults(
    id: string,
    results: {
      answers: Prisma.InputJsonValue;
      kinNatal: number | null;
      kinData: Prisma.InputJsonValue;
      archetypePrimary: string;
      archetypeSecondary: string;
      archetypeScores: Prisma.InputJsonValue;
      vocational: Prisma.InputJsonValue;
      synthesis: string;
      astrology: Prisma.InputJsonValue;
      dna: Prisma.InputJsonValue;
      humanDesign: Prisma.InputJsonValue;
      birthLat?: number | null;
      birthLng?: number | null;
      birthTz?: string | null;
    }
  ) {
    return this._profile.model.religareProfile.update({
      where: { id },
      data: { ...results, status: 'COMPLETE' },
      select: PROFILE_DETAIL_SELECT,
    });
  }

  softDeleteProfile(id: string) {
    return this._profile.model.religareProfile.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  profileBelongsToOrg(orgId: string, id: string) {
    return this._profile.model.religareProfile.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
  }
}
