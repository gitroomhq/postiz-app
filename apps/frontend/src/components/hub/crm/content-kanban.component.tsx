'use client';

import { useState, useCallback } from 'react';
import { Plus, Link2, CheckCircle2, AlertCircle, Clock, Archive, Send, FileText } from 'lucide-react';
import { useContentItems, useContentMutations, ContentItem } from './use-content.hook';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  ADJUSTMENT_REQUESTED: 'Ajuste solicitado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'var(--voc-ink-soft)',
  PENDING_APPROVAL: 'var(--voc-peach)',
  APPROVED: 'var(--voc-blue)',
  ADJUSTMENT_REQUESTED: 'var(--voc-rose)',
  PUBLISHED: '#22c55e',
  ARCHIVED: 'var(--voc-ink-soft)',
};

const STATUS_ICONS: Record<string, React.FC<{ size: number }>> = {
  DRAFT: FileText,
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle2,
  ADJUSTMENT_REQUESTED: AlertCircle,
  PUBLISHED: Send,
  ARCHIVED: Archive,
};

const COLUMNS = ['DRAFT', 'PENDING_APPROVAL', 'ADJUSTMENT_REQUESTED', 'APPROVED', 'PUBLISHED'];

function ItemCard({ item, onStatusChange, onSendForApproval }: {
  item: ContentItem;
  onStatusChange: (id: string, status: string) => void;
  onSendForApproval: (id: string) => void;
}) {
  const StatusIcon = STATUS_ICONS[item.status] ?? FileText;

  return (
    <div
      className="rounded-[10px] p-[12px] mb-[8px] cursor-default"
      style={{
        background: 'var(--voc-paper-raised)',
        border: '1px solid var(--voc-line)',
      }}
    >
      <div className="flex items-start justify-between gap-[8px]">
        <p className="text-[13px] font-[600] leading-snug flex-1" style={{ color: 'var(--voc-ink)' }}>
          {item.title}
        </p>
        <StatusIcon size={14} style={{ color: STATUS_COLORS[item.status], flexShrink: 0, marginTop: 2 }} />
      </div>
      {item.body && (
        <p className="text-[11px] mt-[6px] line-clamp-2" style={{ color: 'var(--voc-ink-soft)' }}>
          {item.body}
        </p>
      )}
      <div className="flex items-center justify-between mt-[10px]">
        <span className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: STATUS_COLORS[item.status] }}>
          {STATUS_LABELS[item.status]}
        </span>
        {item.status === 'DRAFT' && (
          <button
            onClick={() => onSendForApproval(item.id)}
            className="text-[10px] font-[700] px-[8px] py-[3px] rounded-full transition-colors"
            style={{ background: 'rgba(207,98,149,0.12)', color: 'var(--voc-rose)' }}
          >
            Enviar para aprovação
          </button>
        )}
      </div>
    </div>
  );
}

function NewItemForm({ onAdd, onCancel }: { onAdd: (title: string, body: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="rounded-[10px] p-[12px] mb-[8px]" style={{ background: 'var(--voc-paper-raised)', border: '1px solid var(--voc-line)' }}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do conteúdo"
        className="w-full text-[13px] font-[600] bg-transparent outline-none mb-[8px]"
        style={{ color: 'var(--voc-ink)', borderBottom: '1px solid var(--voc-line)', paddingBottom: 6 }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Texto/descrição (opcional)"
        rows={2}
        className="w-full text-[12px] bg-transparent outline-none resize-none"
        style={{ color: 'var(--voc-ink-soft)' }}
      />
      <div className="flex gap-[8px] mt-[10px]">
        <button
          onClick={() => { if (title.trim()) onAdd(title.trim(), body.trim()); }}
          className="text-[11px] font-[700] px-[12px] py-[5px] rounded-full"
          style={{ background: 'var(--voc-violet)', color: '#fff' }}
        >
          Adicionar
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] font-[600] px-[12px] py-[5px] rounded-full"
          style={{ background: 'var(--voc-line)', color: 'var(--voc-ink-soft)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

interface Props {
  projectId: string;
  orgBaseUrl?: string;
}

export function ContentKanban({ projectId, orgBaseUrl }: Props) {
  const { data: items = [], isLoading } = useContentItems(projectId);
  const { createItem, updateItem, generatePortalLink } = useContentMutations(projectId);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  const handleAdd = useCallback(
    async (title: string, body: string) => {
      await createItem({ title, body, type: 'POST' });
      setAddingIn(null);
    },
    [createItem],
  );

  const handleSendForApproval = useCallback(
    async (id: string) => {
      await updateItem(id, { status: 'PENDING_APPROVAL' });
    },
    [updateItem],
  );

  const handleGenerateLink = useCallback(async () => {
    setGeneratingLink(true);
    try {
      const { token } = await generatePortalLink();
      const base = orgBaseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
      setPortalUrl(`${base}/aprovar/${token}`);
    } finally {
      setGeneratingLink(false);
    }
  }, [generatePortalLink, orgBaseUrl]);

  const handleCopyLink = useCallback(() => {
    if (portalUrl) navigator.clipboard.writeText(portalUrl);
  }, [portalUrl]);

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
      {/* Portal link bar */}
      <div className="flex items-center justify-between mb-[20px]">
        <p className="text-[11px] font-[700] uppercase tracking-[0.1em]" style={{ color: 'var(--voc-ink-soft)' }}>
          Kanban de conteúdo
        </p>
        <div className="flex items-center gap-[8px]">
          {portalUrl ? (
            <>
              <span className="text-[11px] max-w-[240px] truncate" style={{ color: 'var(--voc-ink-soft)' }}>{portalUrl}</span>
              <button
                onClick={handleCopyLink}
                className="text-[11px] font-[700] px-[12px] py-[5px] rounded-full flex items-center gap-[5px]"
                style={{ background: 'rgba(40,151,191,0.12)', color: 'var(--voc-blue)' }}
              >
                <Link2 size={12} /> Copiar
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className="text-[11px] font-[700] px-[12px] py-[5px] rounded-full flex items-center gap-[5px] disabled:opacity-50"
              style={{ background: 'rgba(40,151,191,0.12)', color: 'var(--voc-blue)' }}
            >
              <Link2 size={12} /> {generatingLink ? 'Gerando…' : 'Gerar link de aprovação'}
            </button>
          )}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-[16px] overflow-x-auto pb-[16px]">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.status === col);
          return (
            <div key={col} className="flex-shrink-0 w-[240px]">
              <div className="flex items-center justify-between mb-[10px]">
                <span className="text-[11px] font-[700] uppercase tracking-wide" style={{ color: STATUS_COLORS[col] }}>
                  {STATUS_LABELS[col]}
                </span>
                <span className="text-[11px] font-[700] w-[20px] h-[20px] rounded-full flex items-center justify-center" style={{ background: 'var(--voc-line)', color: 'var(--voc-ink-soft)' }}>
                  {colItems.length}
                </span>
              </div>

              <div
                className="min-h-[200px] rounded-[14px] p-[10px]"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px dashed var(--voc-line)' }}
              >
                {colItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onStatusChange={(id, status) => updateItem(id, { status })}
                    onSendForApproval={handleSendForApproval}
                  />
                ))}

                {col === 'DRAFT' && (
                  addingIn === 'DRAFT' ? (
                    <NewItemForm onAdd={handleAdd} onCancel={() => setAddingIn(null)} />
                  ) : (
                    <button
                      onClick={() => setAddingIn('DRAFT')}
                      className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[8px] text-[12px] font-[600] transition-colors"
                      style={{ color: 'var(--voc-ink-soft)', border: '1px dashed var(--voc-line)' }}
                    >
                      <Plus size={14} /> Novo item
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
