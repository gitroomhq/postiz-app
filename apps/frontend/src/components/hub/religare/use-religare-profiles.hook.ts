import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import type {
  ArchetypeKey,
  AstrologyResult,
  HumanDesignResult,
  KinResult,
  ReligareDNA,
  VocationalResult,
} from '@gitroom/helpers/utils/religare';

export interface ReligareProfileListItem {
  id: string;
  expertId: string | null;
  name: string;
  status: 'DRAFT' | 'COMPLETE';
  kinNatal: number | null;
  kinData: KinResult | null;
  archetypePrimary: ArchetypeKey | null;
  archetypeSecondary: ArchetypeKey | null;
  createdAt: string;
  updatedAt: string;
  expert?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    handle: string | null;
  } | null;
}

export interface ReligareProfileDetail extends ReligareProfileListItem {
  birthDate: string | null;
  birthTime: string | null;
  birthPlace: string | null;
  birthLat: number | null;
  birthLng: number | null;
  birthTz: string | null;
  answers: Record<string, unknown> | null;
  archetypeScores: Record<ArchetypeKey, number> | null;
  vocational: VocationalResult | null;
  synthesis: string | null;
  astrology: AstrologyResult | null;
  dna: ReligareDNA | null;
  humanDesign: HumanDesignResult | null;
  brandProfile: Record<string, unknown> | null;
  shareToken: string | null;
}

interface ProfilesResponse {
  items: ReligareProfileListItem[];
  total: number;
  page: number;
}

/** Todos os perfis Religare da organização. */
export const useReligareProfiles = () => {
  const fetch = useFetch();

  const load = useCallback(
    async (path: string) => {
      const res = await (await fetch(path)).json();
      return (res.items ?? []) as ReligareProfileListItem[];
    },
    [fetch]
  );

  return useSWR<ReligareProfileListItem[]>('/hub/religare/profiles', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    fallbackData: [],
  });
};

export type { ProfilesResponse };
