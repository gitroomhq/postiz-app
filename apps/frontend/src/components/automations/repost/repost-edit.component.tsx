'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useRepostLogs,
  useRepostRule,
} from '@gitroom/frontend/components/automations/hooks/use-repost';
import { RepostRuleForm } from '@gitroom/frontend/components/automations/repost/repost-rule-form.component';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

interface Props {
  id: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DOWNLOADED: 'Baixado',
  PUBLISHED: 'Publicado',
  PARTIAL: 'Parcial',
  SKIPPED: 'Pulado',
  FAILED: 'Falhou',
};

export const RepostEditComponent: FC<Props> = ({ id }) => {
  const t = useT();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data: rule, isLoading, mutate } = useRepostRule(id);
  const { data: logs, isLoading: loadingLogs } = useRepostLogs(id, page, 10);

  if (isLoading || !rule) return <LoadingComponent />;

  return (
    <div className="flex flex-col gap-[20px] p-[24px] flex-1">
      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          onClick={() => router.push('/automacoes')}
          aria-label={t('back', 'Voltar')}
          className="text-customColor18 hover:text-textColor text-[18px]"
        >
          &larr;
        </button>
        <h1 className="text-[20px] font-semibold text-textColor">
          {t('repost_edit_title', 'Editar regra de Repost')}
        </h1>
      </div>
      <RepostRuleForm
        mode="edit"
        initial={rule}
        onSaved={() => {
          mutate();
          router.push('/automacoes');
        }}
        onCancel={() => router.push('/automacoes')}
      />

      <div className="flex flex-col gap-[8px] pt-[16px] border-t border-fifth">
        <h3 className="text-[14px] font-semibold text-textColor">
          {t('repost_history_title', 'Histórico da regra')}
        </h3>
        {loadingLogs ? (
          <p className="text-[12px] text-customColor18">
            {t('loading', 'Carregando...')}
          </p>
        ) : !logs || logs.rows.length === 0 ? (
          <p className="text-[12px] text-customColor18">
            {t(
              'repost_history_empty',
              'Ainda não há execuções registradas para esta regra.'
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {logs.rows.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-[12px] bg-sixth border border-fifth rounded-[4px] px-[12px] py-[10px]"
              >
                <span className="text-[11px] text-customColor18 w-[120px]">
                  {dayjs(log.discoveredAt).format('DD/MM HH:mm')}
                </span>
                <span className="text-[12px] text-textColor flex-1 truncate">
                  {log.sourceItemId}
                </span>
                <span
                  className={`text-[10px] px-[8px] py-[2px] rounded-[4px] ${
                    log.status === 'PUBLISHED'
                      ? 'bg-customColor42/20 text-customColor42'
                      : log.status === 'PARTIAL'
                      ? 'bg-customColor13/20 text-customColor13'
                      : log.status === 'FAILED'
                      ? 'bg-customColor19/20 text-customColor19'
                      : 'bg-btnSimple text-customColor18'
                  }`}
                >
                  {t(
                    `repost_history_status_${log.status.toLowerCase()}`,
                    STATUS_LABEL[log.status] || log.status
                  )}
                </span>
                {log.skippedReason && (
                  <span className="text-[10px] text-customColor18">
                    {log.skippedReason}
                  </span>
                )}
                {log.errorMessage && (
                  <span
                    className="text-[10px] text-customColor19 truncate max-w-[220px]"
                    title={log.errorMessage}
                  >
                    {log.errorMessage}
                  </span>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between mt-[8px] text-[12px] text-customColor18">
              <span>
                {t('page', 'Página')} {logs.page} · {logs.total}{' '}
                {t('repost_history_entries', 'entradas')}
              </span>
              <div className="flex items-center gap-[8px]">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="rounded-[4px] border border-fifth px-[8px] py-[4px] text-[12px] disabled:opacity-50"
                >
                  ‹
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={logs.rows.length < logs.size}
                  className="rounded-[4px] border border-fifth px-[8px] py-[4px] text-[12px] disabled:opacity-50"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
