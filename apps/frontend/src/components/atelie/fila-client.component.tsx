'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Sparkles, Copy, Clock, CheckCircle2, Send, Archive, FileText } from 'lucide-react';
import { useAtelieFila, useAtelieMutations, ServiceRequest } from './use-atelie-fila.hook';

const STATUS_LABELS: Record<string, string> = {
  SOLICITADO: 'Solicitado',
  CONFIRMADO: 'Confirmado',
  EM_PRODUCAO: 'Em produção',
  EM_REVISAO: 'Em revisão',
  ENTREGUE: 'Entregue',
  APROVADO: 'Aprovado',
};

const STATUS_COLORS: Record<string, string> = {
  SOLICITADO: 'var(--voc-peach)',
  CONFIRMADO: 'var(--voc-blue)',
  EM_PRODUCAO: 'var(--voc-violet)',
  EM_REVISAO: 'var(--voc-rose)',
  ENTREGUE: '#22c55e',
  APROVADO: '#22c55e',
};

const STATUS_ICONS: Record<string, React.FC<{ size: number }>> = {
  SOLICITADO: FileText,
  CONFIRMADO: Clock,
  EM_PRODUCAO: Sparkles,
  EM_REVISAO: AlertTriangle,
  ENTREGUE: Send,
  APROVADO: CheckCircle2,
};

const COLUMNS = ['SOLICITADO', 'CONFIRMADO', 'EM_PRODUCAO', 'EM_REVISAO', 'ENTREGUE', 'APROVADO'];

const NEXT_STATUS: Record<string, string | undefined> = {
  SOLICITADO: 'CONFIRMADO',
  CONFIRMADO: 'EM_PRODUCAO',
  EM_PRODUCAO: 'EM_REVISAO',
  EM_REVISAO: 'ENTREGUE',
  ENTREGUE: 'APROVADO',
};

/**
 * Prompt estruturado pro operador colar no Claude Code — sem chamar nenhuma API de IA
 * daqui (princípio da AT-0: zero token gasto no cockpit em si).
 */
function buildOperatorPrompt(request: ServiceRequest): string {
  const lines = [
    `Rodar a skill /atelie para o serviço "${request.offering.name}" (${request.offering.slug}).`,
    `Projeto: ${request.project.name} (projectId=${request.projectId}).`,
    `Escopo: ${request.scopeLevel}.`,
  ];
  if (!request.contextPackComplete) {
    lines.push('⚠️ Context Pack incompleto no CRM — confirmar cores/tipografia/persona/CTA antes de produzir.');
  }
  if (!request.hasReligareProfile) {
    lines.push('⚠️ Cliente sem perfil Religare — direção vocacional não pode ser validada nesta rodada.');
  }
  lines.push('', 'Briefing:', JSON.stringify(request.briefing, null, 2));
  return lines.join('\n');
}

function RequestCard({ request, onAdvance, onCopyPrompt }: {
  request: ServiceRequest;
  onAdvance: (id: string) => void;
  onCopyPrompt: (request: ServiceRequest) => void;
}) {
  const StatusIcon = STATUS_ICONS[request.status] ?? FileText;
  const nextStatus = NEXT_STATUS[request.status];

  return (
    <div
      className="rounded-[10px] p-[12px] mb-[8px]"
      style={{ background: 'var(--voc-paper-raised)', border: '1px solid var(--voc-line)' }}
    >
      <div className="flex items-start justify-between gap-[8px]">
        <p className="text-[13px] font-[600] leading-snug flex-1" style={{ color: 'var(--voc-ink)' }}>
          {request.offering.name}
        </p>
        <StatusIcon size={14} style={{ color: STATUS_COLORS[request.status], flexShrink: 0, marginTop: 2 }} />
      </div>
      <p className="text-[11px] mt-[4px]" style={{ color: 'var(--voc-ink-soft)' }}>
        {request.project.name} · {request.scopeLevel}
      </p>

      {(!request.contextPackComplete || !request.hasReligareProfile) && (
        <div className="flex flex-col gap-[4px] mt-[8px]">
          {!request.contextPackComplete && (
            <span className="text-[10px] font-[700] flex items-center gap-[4px]" style={{ color: 'var(--voc-peach)' }}>
              <AlertTriangle size={11} /> Context Pack incompleto
            </span>
          )}
          {!request.hasReligareProfile && (
            <span className="text-[10px] font-[700] flex items-center gap-[4px]" style={{ color: 'var(--voc-rose)' }}>
              <AlertTriangle size={11} /> Sem perfil Religare
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-[8px] mt-[10px]">
        <button
          onClick={() => onCopyPrompt(request)}
          className="text-[10px] font-[700] px-[8px] py-[3px] rounded-full flex items-center gap-[4px]"
          style={{ background: 'rgba(124,94,225,0.12)', color: 'var(--voc-violet)' }}
        >
          <Copy size={11} /> Gerar prompt do operador
        </button>
        {nextStatus && (
          <button
            onClick={() => onAdvance(request.id)}
            className="text-[10px] font-[700] px-[8px] py-[3px] rounded-full"
            style={{ background: 'var(--voc-line)', color: 'var(--voc-ink-soft)' }}
          >
            → {STATUS_LABELS[nextStatus]}
          </button>
        )}
      </div>
    </div>
  );
}

export function AtelieFilaClient() {
  const { data: requests = [], isLoading } = useAtelieFila();
  const { updateStatus } = useAtelieMutations();
  const [promptFor, setPromptFor] = useState<ServiceRequest | null>(null);

  const handleAdvance = useCallback(
    async (id: string) => {
      const request = requests.find((r) => r.id === id);
      const next = request ? NEXT_STATUS[request.status] : undefined;
      if (next) await updateStatus(id, next);
    },
    [requests, updateStatus],
  );

  const handleCopyPrompt = useCallback((request: ServiceRequest) => {
    const prompt = buildOperatorPrompt(request);
    navigator.clipboard.writeText(prompt);
    setPromptFor(request);
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-[16px] overflow-x-auto pb-[16px] animate-pulse">
        {COLUMNS.map((col) => (
          <div key={col} className="flex-shrink-0 w-[240px] h-[300px] rounded-[14px]" style={{ background: 'var(--voc-paper-raised)' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px]">
        <p className="text-[11px] font-[700] uppercase tracking-[0.1em]" style={{ color: 'var(--voc-ink-soft)' }}>
          Ateliê Virtual — fila de pedidos (AT-2)
        </p>
        {promptFor && (
          <span className="text-[11px]" style={{ color: 'var(--voc-blue)' }}>
            Prompt de &quot;{promptFor.offering.name}&quot; copiado — cole no Claude Code.
          </span>
        )}
      </div>

      <div className="flex gap-[16px] overflow-x-auto pb-[16px]">
        {COLUMNS.map((col) => {
          const colItems = requests.filter((r) => r.status === col);
          return (
            <div key={col} className="flex-shrink-0 w-[240px]">
              <div className="flex items-center justify-between mb-[10px]">
                <span className="text-[11px] font-[700] uppercase tracking-wide" style={{ color: STATUS_COLORS[col] }}>
                  {STATUS_LABELS[col]}
                </span>
                <span
                  className="text-[11px] font-[700] w-[20px] h-[20px] rounded-full flex items-center justify-center"
                  style={{ background: 'var(--voc-line)', color: 'var(--voc-ink-soft)' }}
                >
                  {colItems.length}
                </span>
              </div>

              <div
                className="min-h-[200px] rounded-[14px] p-[10px]"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px dashed var(--voc-line)' }}
              >
                {colItems.length === 0 && (
                  <p className="text-[11px] text-center py-[24px]" style={{ color: 'var(--voc-ink-soft)' }}>
                    {col === 'SOLICITADO' && requests.length === 0
                      ? 'Nenhum pedido ainda — criado pela skill /atelie ou pelo front-office (AT-3).'
                      : 'Vazio'}
                  </p>
                )}
                {colItems.map((request) => (
                  <RequestCard key={request.id} request={request} onAdvance={handleAdvance} onCopyPrompt={handleCopyPrompt} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
