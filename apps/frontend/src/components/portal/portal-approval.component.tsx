'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';

const BACKEND = process.env['NEXT_PUBLIC_BACKEND_URL'] ?? '';

function portalFetch(path: string, init?: RequestInit) {
  return fetch(`${BACKEND}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
}
import { CheckCircle2, AlertCircle, MessageSquare, FileText, Clock, Send } from 'lucide-react';

interface PortalItem {
  id: string;
  title: string;
  body?: string;
  type: string;
  status: string;
  scheduledAt?: string;
  events?: Array<{ id: string; type: string; text?: string; byGuest: boolean; createdAt: string }>;
}

interface PortalFeed {
  projectId: string;
  items: PortalItem[];
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovado ✓',
  ADJUSTMENT_REQUESTED: 'Ajuste solicitado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

/**
 * Literais em hex (não var()) porque são concatenados com sufixo de alpha
 * (ex: `${STATUS_COLORS[status]}18`) para o fundo translúcido do badge —
 * sincronizados com --voc-peach/--voc-blue/--voc-rose (vocaccio-tokens.scss).
 */
const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: '#f29676',
  APPROVED: '#23a6d6',
  ADJUSTMENT_REQUESTED: '#df548e',
  PUBLISHED: '#22c55e',
  DRAFT: '#888',
  ARCHIVED: '#888',
};

function ItemCard({ item, token, onAction }: { item: PortalItem; token: string; onAction: () => void }) {
  const [commenting, setCommenting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [adjustmentText, setAdjustmentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(item.status);

  const doApprove = useCallback(async () => {
    setLoading(true);
    try {
      await portalFetch(`/portal/${token}/items/${item.id}/approve`, { method: 'POST' });
      setLocalStatus('APPROVED');
      onAction();
    } finally {
      setLoading(false);
    }
  }, [token, item.id, onAction]);

  const doRequestAdjustment = useCallback(async () => {
    if (!adjustmentText.trim()) return;
    setLoading(true);
    try {
      await portalFetch(`/portal/${token}/items/${item.id}/request-adjustment`, {
        method: 'POST',
        body: JSON.stringify({ text: adjustmentText }),
      });
      setLocalStatus('ADJUSTMENT_REQUESTED');
      setRequesting(false);
      setAdjustmentText('');
      onAction();
    } finally {
      setLoading(false);
    }
  }, [token, item.id, adjustmentText, onAction]);

  const doComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setLoading(true);
    try {
      await portalFetch(`/portal/${token}/items/${item.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText }),
      });
      setCommenting(false);
      setCommentText('');
      onAction();
    } finally {
      setLoading(false);
    }
  }, [token, item.id, commentText, onAction]);

  const isPending = localStatus === 'PENDING_APPROVAL' || localStatus === 'ADJUSTMENT_REQUESTED';

  return (
    <div
      className="rounded-[16px] p-[24px] mb-[16px]"
      style={{
        background: '#fff',
        border: `1px solid ${localStatus === 'APPROVED' ? '#23a6d644' : '#e8e3de'}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-start justify-between gap-[12px] mb-[12px]">
        <h3 className="text-[18px] font-[700] leading-snug" style={{ color: 'var(--voc-ink)', fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
          {item.title}
        </h3>
        <span
          className="text-[11px] font-[700] px-[10px] py-[4px] rounded-full whitespace-nowrap"
          style={{ background: `${STATUS_COLORS[localStatus]}18`, color: STATUS_COLORS[localStatus] }}
        >
          {STATUS_LABELS[localStatus] ?? localStatus}
        </span>
      </div>

      {item.body && (
        <p className="text-[14px] leading-relaxed mb-[16px]" style={{ color: 'var(--voc-ink-soft)' }}>
          {item.body}
        </p>
      )}

      {/* Events thread */}
      {item.events && item.events.length > 0 && (
        <div className="mb-[16px] space-y-[8px]">
          {item.events.map((ev) => (
            <div key={ev.id} className="text-[12px] px-[12px] py-[8px] rounded-[8px]" style={{ background: ev.byGuest ? '#fdf5f0' : '#f5f3ff', color: '#5a5550' }}>
              <span className="font-[700]" style={{ color: ev.byGuest ? 'var(--voc-peach)' : 'var(--voc-violet)' }}>
                {ev.byGuest ? 'Você' : 'Equipe'}:
              </span>{' '}
              {ev.text}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {isPending && !requesting && !commenting && (
        <div className="flex flex-wrap gap-[10px]">
          <button
            onClick={doApprove}
            disabled={loading}
            className="flex items-center gap-[6px] px-[18px] py-[9px] rounded-full text-[13px] font-[700] transition-all disabled:opacity-50"
            style={{ background: 'var(--voc-blue)', color: '#fff' }}
          >
            <CheckCircle2 size={15} /> Aprovar
          </button>
          <button
            onClick={() => setRequesting(true)}
            disabled={loading}
            className="flex items-center gap-[6px] px-[18px] py-[9px] rounded-full text-[13px] font-[700] transition-all disabled:opacity-50"
            style={{ background: '#df548e18', color: 'var(--voc-rose)' }}
          >
            <AlertCircle size={15} /> Solicitar ajuste
          </button>
          <button
            onClick={() => setCommenting(true)}
            disabled={loading}
            className="flex items-center gap-[6px] px-[18px] py-[9px] rounded-full text-[13px] font-[700] transition-all disabled:opacity-50"
            style={{ background: '#f5f3ff', color: 'var(--voc-violet)' }}
          >
            <MessageSquare size={15} /> Comentar
          </button>
        </div>
      )}

      {requesting && (
        <div className="mt-[12px]">
          <textarea
            autoFocus
            value={adjustmentText}
            onChange={(e) => setAdjustmentText(e.target.value)}
            placeholder="Descreva o ajuste necessário…"
            rows={3}
            className="w-full text-[13px] p-[12px] rounded-[10px] outline-none resize-none"
            style={{ border: '1px solid #e8e3de', color: 'var(--voc-ink)' }}
          />
          <div className="flex gap-[8px] mt-[8px]">
            <button
              onClick={doRequestAdjustment}
              disabled={loading || !adjustmentText.trim()}
              className="px-[16px] py-[7px] rounded-full text-[12px] font-[700] disabled:opacity-50"
              style={{ background: 'var(--voc-rose)', color: '#fff' }}
            >
              Enviar
            </button>
            <button onClick={() => setRequesting(false)} className="px-[16px] py-[7px] rounded-full text-[12px] font-[600]" style={{ background: '#f0ece8', color: '#5a5550' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {commenting && (
        <div className="mt-[12px]">
          <textarea
            autoFocus
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Escreva um comentário…"
            rows={2}
            className="w-full text-[13px] p-[12px] rounded-[10px] outline-none resize-none"
            style={{ border: '1px solid #e8e3de', color: 'var(--voc-ink)' }}
          />
          <div className="flex gap-[8px] mt-[8px]">
            <button
              onClick={doComment}
              disabled={loading || !commentText.trim()}
              className="px-[16px] py-[7px] rounded-full text-[12px] font-[700] disabled:opacity-50"
              style={{ background: 'var(--voc-violet)', color: '#fff' }}
            >
              Comentar
            </button>
            <button onClick={() => setCommenting(false)} className="px-[16px] py-[7px] rounded-full text-[12px] font-[600]" style={{ background: '#f0ece8', color: '#5a5550' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {localStatus === 'APPROVED' && (
        <div className="flex items-center gap-[6px] text-[13px] font-[700]" style={{ color: 'var(--voc-blue)' }}>
          <CheckCircle2 size={16} /> Conteúdo aprovado
        </div>
      )}
    </div>
  );
}

export function PortalApprovalPage({ token }: { token: string }) {
  const { data, error, mutate } = useSWR<PortalFeed>(
    token ? `/portal/${token}` : null,
    (path: string) => portalFetch(path).then((r) => {
      if (!r.ok) throw new Error('invalid');
      return r.json();
    }),
  );

  const pending = data?.items.filter((i) => i.status === 'PENDING_APPROVAL' || i.status === 'ADJUSTMENT_REQUESTED') ?? [];
  const rest = data?.items.filter((i) => i.status !== 'PENDING_APPROVAL' && i.status !== 'ADJUSTMENT_REQUESTED') ?? [];

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-[24px]" style={{ background: 'var(--voc-paper-raised)' }}>
        <div className="text-center max-w-[360px]">
          <AlertCircle size={48} className="mx-auto mb-[16px]" style={{ color: 'var(--voc-rose)' }} />
          <h1 className="text-[24px] font-[700] mb-[8px]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'var(--voc-ink)' }}>
            Link inválido
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--voc-ink-soft)' }}>
            Este link de aprovação não existe ou foi revogado. Solicite um novo link à equipe.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--voc-paper-raised)' }}>
        <div className="w-[48px] h-[48px] rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--voc-violet)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--voc-paper-raised)' }}>
      {/* Header */}
      <div className="px-[24px] py-[32px] max-w-[680px] mx-auto">
        <p className="text-[11px] font-[900] tracking-[0.14em] uppercase mb-[4px]" style={{ color: 'var(--voc-rose)' }}>
          Vocaccio · Portal de Aprovação
        </p>
        <h1 className="text-[32px] font-[700] leading-tight mb-[6px]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'var(--voc-ink)' }}>
          Revise o conteúdo
        </h1>
        <p className="text-[14px]" style={{ color: 'var(--voc-ink-soft)' }}>
          Aprove, solicite ajustes ou deixe comentários nos itens abaixo.
        </p>

        {/* Stats row */}
        <div className="flex gap-[16px] mt-[20px]">
          {[
            { icon: Clock, label: 'Aguardando', count: pending.length, color: 'var(--voc-peach)' },
            { icon: CheckCircle2, label: 'Aprovados', count: data.items.filter(i => i.status === 'APPROVED').length, color: 'var(--voc-blue)' },
            { icon: FileText, label: 'Total', count: data.items.length, color: 'var(--voc-violet)' },
          ].map(({ icon: Icon, label, count, color }) => (
            <div key={label} className="flex items-center gap-[8px] px-[16px] py-[10px] rounded-[12px]" style={{ background: '#fff', border: '1px solid #e8e3de' }}>
              <Icon size={16} style={{ color }} />
              <div>
                <p className="text-[18px] font-[800] leading-none" style={{ color: 'var(--voc-ink)' }}>{count}</p>
                <p className="text-[10px] font-[600] uppercase tracking-wide" style={{ color: 'var(--voc-ink-soft)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="px-[24px] pb-[48px] max-w-[680px] mx-auto">
        {pending.length > 0 && (
          <>
            <p className="text-[11px] font-[900] tracking-[0.12em] uppercase mb-[12px]" style={{ color: 'var(--voc-peach)' }}>
              Aguardando sua resposta
            </p>
            {pending.map((item) => (
              <ItemCard key={item.id} item={item} token={token} onAction={() => mutate()} />
            ))}
          </>
        )}

        {rest.length > 0 && (
          <>
            {pending.length > 0 && <div className="my-[24px] border-t" style={{ borderColor: '#e8e3de' }} />}
            <p className="text-[11px] font-[900] tracking-[0.12em] uppercase mb-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
              Outros itens
            </p>
            {rest.map((item) => (
              <ItemCard key={item.id} item={item} token={token} onAction={() => mutate()} />
            ))}
          </>
        )}

        {data.items.length === 0 && (
          <div className="text-center py-[64px]">
            <Send size={40} className="mx-auto mb-[16px]" style={{ color: '#c8c0b8' }} />
            <p className="text-[16px] font-[600]" style={{ color: 'var(--voc-ink-soft)' }}>Nenhum conteúdo disponível ainda.</p>
            <p className="text-[13px] mt-[6px]" style={{ color: '#888' }}>A equipe ainda não enviou itens para aprovação.</p>
          </div>
        )}
      </div>

      <div className="pb-[24px] text-center text-[11px]" style={{ color: '#c8c0b8' }}>
        Vocaccio Growth HUB · Soul 2 Soul
      </div>
    </div>
  );
}
