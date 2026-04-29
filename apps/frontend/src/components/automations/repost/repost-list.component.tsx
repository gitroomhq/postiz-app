'use client';

import { FC, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  RepostRule,
  useRepostRules,
} from '@gitroom/frontend/components/automations/hooks/use-repost';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { PlatformIconBadge } from '@gitroom/frontend/components/launches/helpers/platform-icon.helper';
import {
  FORMAT_LABEL,
  SOURCE_TYPE_LABEL,
} from '@gitroom/frontend/components/automations/hooks/use-repost';

export const RepostListComponent: FC = () => {
  const t = useT();
  const router = useRouter();
  const fetchApi = useFetch();
  const toaster = useToaster();
  const { data: rules, isLoading, mutate } = useRepostRules();

  const toggleRule = useCallback(
    async (rule: RepostRule) => {
      const next = !rule.enabled;
      try {
        const res = await fetchApi(`/repost/rules/${rule.id}/toggle`, {
          method: 'POST',
          body: JSON.stringify({ enabled: next }),
        });
        if (!res.ok) {
          toaster.show(
            t('repost_toggle_failed', 'Falha ao alterar o status da regra'),
            'warning'
          );
          return;
        }
        await mutate();
      } catch {
        toaster.show(
          t('repost_toggle_failed', 'Falha ao alterar o status da regra'),
          'warning'
        );
      }
    },
    [fetchApi, mutate, t, toaster]
  );

  const runNow = useCallback(
    async (id: string) => {
      try {
        const res = await fetchApi(`/repost/rules/${id}/run-now`, {
          method: 'POST',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toaster.show(
            body.message ||
              t('repost_run_failed', 'Não foi possível disparar o ciclo'),
            'warning'
          );
          return;
        }
        toaster.show(
          t('repost_run_started', 'Ciclo disparado. Aguarde alguns minutos.'),
          'success'
        );
      } catch {
        toaster.show(
          t('repost_run_failed', 'Não foi possível disparar o ciclo'),
          'warning'
        );
      }
    },
    [fetchApi, t, toaster]
  );

  const deleteRule = useCallback(
    async (id: string) => {
      try {
        const res = await fetchApi(`/repost/rules/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          toaster.show(
            t('repost_delete_failed', 'Falha ao excluir a regra'),
            'warning'
          );
          return;
        }
        await mutate();
        toaster.show(t('repost_deleted', 'Regra excluída'), 'success');
      } catch {
        toaster.show(
          t('repost_delete_failed', 'Falha ao excluir a regra'),
          'warning'
        );
      }
    },
    [fetchApi, mutate, t, toaster]
  );

  if (isLoading) return <LoadingComponent />;

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-textColor">
            {t('repost_list_title', 'Repost')}
          </h1>
          <p className="text-[14px] text-customColor18 mt-[4px]">
            {t(
              'repost_list_subtitle',
              'Publique uma vez. O Repost distribui em todas as suas redes automaticamente.'
            )}
          </p>
        </div>
        <button
          onClick={() => router.push('/automacoes/repost/nova')}
          className="rounded-[4px] bg-btnPrimary px-[16px] py-[8px] text-[14px] text-white hover:opacity-80"
        >
          {t('repost_new_rule', 'Nova regra de Repost')}
        </button>
      </div>

      {!Array.isArray(rules) || rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[64px] text-customColor18 border border-fifth rounded-[8px] bg-sixth">
          <p className="text-[14px]">
            {t(
              'repost_list_empty',
              'Nenhuma regra de repost criada ainda. Crie uma para começar.'
            )}
          </p>
        </div>
      ) : (
        <div className="rounded-[8px] border border-fifth bg-sixth overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-newBgColorInner text-[11px] uppercase tracking-wide text-customColor18">
              <tr>
                <th className="px-[16px] py-[12px] w-[140px]">
                  {t('repost_col_status', 'Status')}
                </th>
                <th className="px-[16px] py-[12px]">
                  {t('repost_col_name', 'Nome/Descrição')}
                </th>
                <th className="px-[16px] py-[12px]">
                  {t('repost_col_channels', 'Conta/Plataforma')}
                </th>
                <th className="px-[16px] py-[12px] w-[120px]">
                  {t('repost_col_executions', 'Execuções')}
                </th>
                <th className="px-[16px] py-[12px] whitespace-nowrap text-right">
                  {t('repost_col_actions', 'Ações')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <RepostRuleRow
                  key={rule.id}
                  rule={rule}
                  isLast={idx === rules.length - 1}
                  onToggle={() => toggleRule(rule)}
                  onEdit={() => router.push(`/automacoes/repost/${rule.id}`)}
                  onRun={() => runNow(rule.id)}
                  onDelete={() => deleteRule(rule.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface RowProps {
  rule: RepostRule;
  isLast: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
}

const RepostRuleRow: FC<RowProps> = ({
  rule,
  isLast,
  onToggle,
  onEdit,
  onRun,
  onDelete,
}) => {
  const t = useT();
  const execCount = rule._count?.logs ?? 0;
  const source = rule.sourceIntegration;
  const destinations = rule.destinations ?? [];

  return (
    <tr
      className={`group hover:bg-boxHover transition-colors ${
        isLast ? '' : 'border-b border-fifth'
      }`}
    >
      <td className="px-[16px] py-[14px]">
        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={onToggle}
            role="switch"
            aria-checked={rule.enabled}
            aria-label={
              rule.enabled
                ? t('repost_toggle_disable', 'Pausar')
                : t('repost_toggle_enable', 'Ativar regra agora')
            }
            className="relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
            style={{
              backgroundColor: rule.enabled ? '#22c55e' : '#52525b',
            }}
          >
            <span
              className={`pointer-events-none absolute top-[2px] left-[2px] inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                rule.enabled ? 'translate-x-[20px]' : 'translate-x-0'
              }`}
            />
          </button>
          <span
            className="rounded-[4px] px-[8px] py-[2px] text-[10px] font-medium"
            style={{
              backgroundColor: rule.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(82,82,91,0.18)',
              color: rule.enabled ? '#16a34a' : '#a1a1aa',
            }}
          >
            {rule.enabled
              ? t('repost_rule_active', 'Ativa')
              : t('repost_rule_paused', 'Pausada')}
          </span>
        </div>
      </td>

      <td className="px-[16px] py-[14px]">
        <button
          type="button"
          onClick={onEdit}
          className="text-left hover:underline"
        >
          <div className="text-[13px] font-medium text-textColor truncate max-w-[360px]">
            {rule.name}
          </div>
          <div className="text-[11px] text-customColor18 mt-[2px]">
            {rule.intervalMinutes < 60
              ? `${rule.intervalMinutes} ${t('minutes_short', 'min')}`
              : `${rule.intervalMinutes / 60} ${t('hours_short', 'h')}`}
            {source
              ? ` · ${source.providerIdentifier.replace('instagram-standalone', 'instagram')} · ${
                  SOURCE_TYPE_LABEL[rule.sourceType] ?? rule.sourceType
                }`
              : ''}
          </div>
        </button>
      </td>

      <td className="px-[16px] py-[14px]">
        <div className="flex items-center gap-[10px]">
          {source ? (
            <div className="relative flex items-center">
              <PlatformIconBadge
                identifier={source.providerIdentifier}
                size={32}
                zernioBadgeSize={15}
                zernioBadgeRadius={15}
              />
            </div>
          ) : (
            <span className="text-[11px] text-customColor19">
              {t('repost_source_missing', 'Origem removida')}
            </span>
          )}
          <span className="text-customColor18 text-[18px] leading-none px-[2px]">
            →
          </span>
          {destinations.length === 0 ? (
            <span className="text-[11px] text-customColor19">
              {t('repost_destinations_missing', 'Sem destinos')}
            </span>
          ) : (
            <div className="flex items-center gap-[8px]">
              {destinations.slice(0, 6).map((d) => {
                const integration = d.integration;
                const providerIdentifier = integration?.providerIdentifier ?? '';
                const name = integration?.name ?? '';
                return (
                  <div
                    key={d.id}
                    className="relative"
                    title={`${name} · ${FORMAT_LABEL[d.format] ?? d.format}`}
                  >
                    <PlatformIconBadge
                      identifier={providerIdentifier || 'instagram'}
                      size={32}
                      zernioBadgeSize={15}
                      zernioBadgeRadius={15}
                      className={integration?.disabled ? 'opacity-40 grayscale' : ''}
                    />
                  </div>
                );
              })}
              {destinations.length > 6 && (
                <span className="text-[11px] text-customColor18">
                  +{destinations.length - 6}
                </span>
              )}
            </div>
          )}
        </div>
      </td>

      <td className="px-[16px] py-[14px]">
        <span className="text-[14px] font-semibold text-textColor">
          {execCount}
        </span>
      </td>

      <td className="px-[16px] py-[14px] whitespace-nowrap">
        <div className="flex items-center justify-end gap-[8px]">
          {rule.enabled && (
            <button
              type="button"
              onClick={onRun}
              title={t('repost_run_now', 'Rodar agora')}
              className="inline-flex items-center gap-[6px] rounded-[4px] border border-newTableBorder bg-newBgColorInner px-[10px] py-[6px] text-[12px] text-textColor hover:bg-boxHover"
            >
              <span aria-hidden>▶</span>
              {t('repost_run_now', 'Rodar agora')}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            title={t('delete', 'Excluir')}
            className="inline-flex items-center gap-[6px] rounded-[4px] border border-[#ef4444]/50 bg-transparent px-[10px] py-[6px] text-[12px] text-[#ef4444] hover:bg-[#ef4444]/10"
          >
            <span aria-hidden>🗑</span>
            {t('delete', 'Excluir')}
          </button>
        </div>
      </td>
    </tr>
  );
};
