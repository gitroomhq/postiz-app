'use client';

import { FC, useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Compass, Stethoscope } from 'lucide-react';
import { useExperts } from '@gitroom/frontend/components/hub/crm/use-experts.hook';
import { useReligareProfiles } from './use-religare-profiles.hook';
import { useReligareContext } from './use-religare-context.hook';
import { useReligareMutations } from './use-religare-mutations.hook';
import { vocabularyFor } from './religare-vocabulary';
import { ARCHETYPE_INFO } from '@gitroom/helpers/utils/religare';

const ModeToggle: FC = () => {
  const { data: context = 'agency' } = useReligareContext();
  const { setContext } = useReligareMutations();
  const modes = [
    { id: 'agency' as const, label: 'Agência', icon: Compass },
    { id: 'therapy' as const, label: 'Terapeuta', icon: Stethoscope },
  ];
  return (
    <div className="flex gap-[2px] p-[3px] rounded-[12px] bg-newBgColorInner border border-newTableBorder">
      {modes.map((m) => {
        const active = context === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => !active && setContext(m.id)}
            className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-[9px] text-[12px] font-[700] transition-colors"
            style={{
              background: active ? 'var(--voc-rose)' : 'transparent',
              color: active ? '#fff' : 'var(--new-table-text)',
            }}
          >
            <Icon size={13} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
};

export const ReligareHome: FC = () => {
  const { data: context = 'agency' } = useReligareContext();
  const { data: experts = [] } = useExperts();
  const { data: profiles = [] } = useReligareProfiles();
  const vocab = vocabularyFor(context);

  const profileByExpert = useMemo(() => {
    const map = new Map<string, (typeof profiles)[0]>();
    for (const p of profiles) if (p.expertId) map.set(p.expertId, p);
    return map;
  }, [profiles]);

  const hasExperts = experts.length > 0;

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      <div className="max-w-[1000px] w-full mx-auto px-[20px] py-[28px]">
        {/* header */}
        <div className="flex items-start justify-between gap-[16px] flex-wrap mb-[24px]">
          <div>
            <div className="flex items-center gap-[10px]">
              <div
                className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center"
                style={{ background: 'var(--voc-aurora)' }}
              >
                <Sparkles size={18} className="text-white" />
              </div>
              <h1 className="text-[22px] font-[800] text-newTextColor">Religare</h1>
            </div>
            <p className="text-[13px] mt-[6px]" style={{ color: 'var(--new-table-text)' }}>
              {vocab.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-[12px]">
            <ModeToggle />
            <Link
              href="/hub/religare/onboarding"
              className="flex items-center gap-[7px] px-[16px] py-[9px] rounded-[12px] text-[13px] font-[700] text-white"
              style={{ background: 'var(--voc-aurora)' }}
            >
              <Plus size={15} />
              {vocab.newProfile}
            </Link>
          </div>
        </div>

        {/* empty: no experts */}
        {!hasExperts && (
          <div className="rounded-[16px] border border-dashed border-newTableBorder p-[40px] text-center">
            <p className="text-[15px] font-[700] text-newTextColor mb-[6px]">
              Nenhum {vocab.person} cadastrado ainda
            </p>
            <p className="text-[13px] mb-[18px]" style={{ color: 'var(--new-table-text)' }}>
              Cadastre {vocab.persons} no CRM ou crie o primeiro Religare agora.
            </p>
            <Link
              href="/hub/religare/onboarding"
              className="inline-flex items-center gap-[7px] px-[16px] py-[9px] rounded-[12px] text-[13px] font-[700] text-white"
              style={{ background: 'var(--voc-aurora)' }}
            >
              <Plus size={15} />
              {vocab.newProfile}
            </Link>
          </div>
        )}

        {/* grid of experts */}
        {hasExperts && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
            {experts.map((expert) => {
              const profile = profileByExpert.get(expert.id);
              const complete = profile?.status === 'COMPLETE';
              const archetype =
                profile?.archetypePrimary &&
                ARCHETYPE_INFO[profile.archetypePrimary]?.name;
              return (
                <div
                  key={expert.id}
                  className="rounded-[16px] bg-newBgColorInner border border-newTableBorder p-[18px] flex flex-col"
                >
                  <div className="flex items-center gap-[12px]">
                    <div
                      className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[16px] font-[800] text-white flex-shrink-0 overflow-hidden"
                      style={{ background: 'var(--voc-violet)' }}
                    >
                      {expert.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={expert.avatarUrl}
                          alt={expert.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        expert.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-[700] text-newTextColor truncate">
                        {expert.name}
                      </div>
                      {expert.handle && (
                        <div
                          className="text-[12px] truncate"
                          style={{ color: 'var(--new-table-text)' }}
                        >
                          @{expert.handle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-[14px] flex-1">
                    {complete ? (
                      <div className="flex flex-wrap gap-[6px]">
                        {profile?.kinData && (
                          <span
                            className="text-[11px] font-[700] px-[9px] py-[4px] rounded-full text-white"
                            style={{ background: profile.kinData.accent }}
                          >
                            Kin {profile.kinNatal} · {profile.kinData.seal}
                          </span>
                        )}
                        {archetype && (
                          <span
                            className="text-[11px] font-[700] px-[9px] py-[4px] rounded-full"
                            style={{
                              background: 'rgba(207,98,149,0.14)',
                              color: 'var(--voc-rose)',
                            }}
                          >
                            {archetype}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className="text-[12px]"
                        style={{ color: 'var(--new-table-text)' }}
                      >
                        {profile ? 'Leitura incompleta' : 'Sem leitura ainda'}
                      </span>
                    )}
                  </div>

                  <div className="mt-[14px]">
                    {profile ? (
                      <Link
                        href={`/hub/religare/perfil/${profile.id}`}
                        className="block text-center text-[13px] font-[700] py-[8px] rounded-[10px] border border-newTableBorder text-newTextColor hover:bg-boxHover transition-colors"
                      >
                        Ver essência
                      </Link>
                    ) : (
                      <Link
                        href={`/hub/religare/onboarding?expertId=${expert.id}`}
                        className="block text-center text-[13px] font-[700] py-[8px] rounded-[10px] text-white"
                        style={{ background: 'var(--voc-rose)' }}
                      >
                        Criar Religare
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
