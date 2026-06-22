'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Sparkles,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  Layers,
  LayoutGrid,
  CalendarDays,
  Settings2,
} from 'lucide-react';
import { useClientsAll } from '@gitroom/frontend/components/hub/crm/use-clients-all.hook';
import { useCrmMutations } from '@gitroom/frontend/components/hub/crm/use-crm-mutations.hook';
import { CAROUSEL_FONTS } from '@gitroom/carousel-engine';
import { useFontLoader } from './use-font-loader.hook';
import {
  createNewCarousel,
  createNewCarouselFromTemplate,
  deleteCarousel,
  duplicateCarousel,
  isProjectActivated,
  listAllCarousels,
  listCarousels,
  migrateLegacyDraft,
  renameCarousel,
  saveDoc,
  type CarouselIndexEntry,
} from './carousel-store';
import type { CarouselTemplate } from '@gitroom/carousel-engine';
import { ProjectSettingsModal, type ProjectOption } from './project-settings.component';
import { AddProjectModal } from './add-project.component';
import { TemplateSelectModal } from './template-select.component';

type Project = 'all' | string;

/** Timestamp relativo curto em pt-BR. */
function timeAgo(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export const CarouselGallery = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: clients, mutate: reloadClients } = useClientsAll();
  const { createClient } = useCrmMutations();
  // injeta as fontes p/ o preview do seletor (nome escrito na própria fonte)
  useFontLoader(useMemo(() => [...CAROUSEL_FONTS], []));

  const initialClient = searchParams.get('clientId');
  const [project, setProject] = useState<Project>(initialClient || 'all');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  // localStorage não é reativo — incrementamos p/ re-listar após mutações.
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((v) => v + 1), []);

  // migra docs legados (chave 'draft') para UUID real — idempotente
  useEffect(() => { migrateLegacyDraft(); refresh(); }, [refresh]);

  // useClientsAll não revalida ao montar (revalidateIfStale:false); numa entrada
  // direta na galeria o cache pode estar vazio — força o fetch dos clientes do CRM.
  useEffect(() => { reloadClients(); }, [reloadClients]);

  const clientIds = useMemo(() => (clients ?? []).map((c) => c.id), [clients]);

  // projeto só aparece como aba quando ativado (tem carrossel ou config global)
  const activatedClients = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return (clients ?? []).filter((c) => isProjectActivated(c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, tick]);

  const unactivatedClients = useMemo<ProjectOption[]>(() => {
    const activeIds = new Set(activatedClients.map((c) => c.id));
    return (clients ?? [])
      .filter((c) => !activeIds.has(c.id))
      .map((c) => ({ id: c.id, name: c.name }));
  }, [clients, activatedClients]);

  const entries = useMemo<CarouselIndexEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    return project === 'all' ? listAllCarousels(clientIds) : listCarousels(project);
    // tick força recomputo após criar/duplicar/excluir/renomear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, clientIds, tick]);

  const projectName =
    project === 'all'
      ? 'Todas as marcas e experts'
      : clients?.find((c) => c.id === project)?.name ?? 'Sem marca/expert';

  const targetClientId = project === 'all' ? null : project;

  // "copiar/herdar config de…" — outros projetos ativados (exclui o atual)
  const otherProjects = useMemo<ProjectOption[]>(
    () =>
      activatedClients
        .filter((c) => c.id !== project)
        .map((c) => ({ id: c.id, name: c.name })),
    [activatedClients, project]
  );

  const openEditor = (id: string, clientId: string | null) => {
    const q = clientId ? `&clientId=${clientId}` : '';
    router.push(`/hub/volatis/criar/carrossel?id=${id}${q}`);
  };

  // "Novo carrossel" sempre pergunta o template (decisão Felipe 2026-06-19) — abre
  // o modal de seleção; a criação efetiva acontece em onTemplateSelected.
  const onNew = () => setShowTemplateSelect(true);

  const onTemplateSelected = (template: CarouselTemplate | null) => {
    const doc = template
      ? createNewCarouselFromTemplate(targetClientId, template)
      : createNewCarousel(targetClientId);
    saveDoc(doc);
    setShowTemplateSelect(false);
    openEditor(doc.id, targetClientId);
  };

  const onDuplicate = (id: string) => {
    duplicateCarousel(id);
    refresh();
  };

  const onDelete = (entry: CarouselIndexEntry) => {
    deleteCarousel(entry.crmClientId, entry.id);
    refresh();
  };

  const onRename = (id: string, title: string) => {
    renameCarousel(id, title);
    refresh();
  };

  const onCreateClient = useCallback(
    async (name: string): Promise<ProjectOption> => {
      const created = await createClient({ name });
      return { id: created.id, name: created.name ?? name };
    },
    [createClient]
  );

  // projeto recém-ativado (existente ou novo) → seleciona e abre o setup de config
  const onProjectAdded = (clientId: string) => {
    setShowAddProject(false);
    setProject(clientId);
    refresh();
    setShowSettings(true);
  };

  // após salvar/limpar/aplicar config: re-lista; se o projeto desativou, volta p/ "Todos"
  const onSettingsChanged = () => {
    refresh();
    if (project !== 'all' && !isProjectActivated(project)) setProject('all');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden text-newTextColor">
      {/* Cabeçalho */}
      <div className="flex items-center gap-[12px] px-[24px] h-[64px] shrink-0 bg-newBgColorInner border-b border-newBorder">
        <span
          className="grid place-items-center w-[34px] h-[34px] rounded-[10px] text-white"
          style={{ background: 'var(--voc-aurora)' }}
        >
          <LayoutGrid size={18} />
        </span>
        <div className="flex flex-col">
          <span className="text-[15px] font-[800] leading-tight">Carrosséis</span>
          <span className="text-[12px] text-textItemBlur leading-tight">
            Volatis · Gerador de carrosséis
          </span>
        </div>
        <div className="ml-auto flex items-center gap-[10px]">
          <Link
            href="/hub/volatis"
            title="Voltar ao calendário de posts"
            className="flex items-center gap-[6px] px-[12px] h-[38px] rounded-[10px] text-[12px] font-[600] border border-newBorder transition-colors text-newTextColor hover:bg-boxHover"
            style={{ background: 'var(--new-bgColor)' }}
          >
            <CalendarDays size={14} />
            Calendário
          </Link>
          <button
            type="button"
            onClick={onNew}
            className="flex items-center gap-[7px] text-[13px] font-[800] px-[16px] py-[9px] rounded-full text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--voc-aurora)', boxShadow: '0 8px 20px rgba(207,98,149,0.28)' }}
          >
            <Plus size={16} />
            Novo carrossel
          </button>
        </div>
      </div>

      {/* Abas de projeto (só clientes ativados — sem scroll horizontal, quebra linha) */}
      <div className="flex items-start gap-[16px] px-[24px] py-[10px] shrink-0 border-b border-newBorder bg-newBgColor">
        <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-textItemBlur mt-[9px] shrink-0">
          Marcas / Experts
        </span>
        <div className="flex flex-wrap items-center gap-[8px] flex-1 min-w-0">
          <ProjectTab label="Todos" active={project === 'all'} onClick={() => setProject('all')} />
          {activatedClients.map((c) => (
            <ProjectTab
              key={c.id}
              label={c.name}
              active={project === c.id}
              onClick={() => setProject(c.id)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAddProject(true)}
          className="flex items-center gap-[6px] text-[12px] font-[700] px-[14px] h-[34px] rounded-[10px] border border-dashed border-newBorder text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors shrink-0"
        >
          <Plus size={14} />
          Adicionar marca/expert
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-h-0 overflow-y-auto p-[24px] bg-newBgColor">
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[14px] font-[800]">
            {projectName}
            <span className="ml-[8px] text-[12px] font-[600] text-textItemBlur">
              {entries.length} {entries.length === 1 ? 'carrossel' : 'carrosséis'}
            </span>
          </h2>
          {project !== 'all' && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              title="Cores, campos globais e fontes favoritas desta marca/expert"
              className="flex items-center gap-[6px] text-[12px] font-[700] px-[12px] h-[34px] rounded-[10px] border border-newBorder text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
            >
              <Settings2 size={14} />
              Configurações da marca/expert
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <EmptyState onNew={onNew} />
        ) : (
          <div className="grid gap-[16px] grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {entries.map((e) => (
              <CarouselCard
                key={e.id}
                entry={e}
                onOpen={() => openEditor(e.id, e.crmClientId)}
                onDuplicate={() => onDuplicate(e.id)}
                onDelete={() => onDelete(e)}
                onRename={(title) => onRename(e.id, title)}
              />
            ))}
          </div>
        )}
      </div>

      {showSettings && project !== 'all' && (
        <ProjectSettingsModal
          clientId={project}
          projectName={projectName}
          otherProjects={otherProjects}
          carouselCount={entries.length}
          onClose={() => setShowSettings(false)}
          onChanged={onSettingsChanged}
        />
      )}

      {showAddProject && (
        <AddProjectModal
          existingUnactivated={unactivatedClients}
          activatedProjects={activatedClients.map((c) => ({ id: c.id, name: c.name }))}
          onCreateClient={onCreateClient}
          onDone={onProjectAdded}
          onClose={() => setShowAddProject(false)}
        />
      )}

      {showTemplateSelect && (
        <TemplateSelectModal
          onSelect={onTemplateSelected}
          onClose={() => setShowTemplateSelect(false)}
        />
      )}
    </div>
  );
};

const ProjectTab = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 text-[13px] font-[700] px-[14px] h-[34px] rounded-full border transition-colors"
    style={
      active
        ? { background: 'var(--voc-rose)', color: '#fff', borderColor: 'transparent' }
        : { background: 'var(--new-bgColorInner)', borderColor: 'var(--new-border)', color: 'var(--new-textColor)' }
    }
  >
    {label}
  </button>
);

const CarouselCard = ({
  entry,
  onOpen,
  onDuplicate,
  onDelete,
  onRename,
}: {
  entry: CarouselIndexEntry;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(entry.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== entry.title) onRename(next);
    else setDraft(entry.title);
    setRenaming(false);
  };

  return (
    <div className="group flex flex-col rounded-[14px] bg-newBgColorInner border border-newBorder transition-colors hover:border-[var(--voc-rose)]">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full aspect-[4/5] overflow-hidden rounded-t-[14px]"
        title="Abrir"
      >
        {entry.coverDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.coverDataUrl} alt={entry.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full grid place-items-center"
            style={{ background: 'linear-gradient(150deg, rgba(207,98,149,0.18), rgba(124,109,242,0.18))' }}
          >
            <Sparkles size={28} className="text-textItemBlur" />
          </div>
        )}
        <span className="absolute top-[8px] left-[8px] flex items-center gap-[4px] text-[10px] font-[700] px-[8px] py-[3px] rounded-full text-white bg-black/55 backdrop-blur-sm">
          <Layers size={11} />
          {entry.slideCount}
        </span>
        <span className="absolute top-[8px] right-[8px] text-[10px] font-[700] px-[7px] py-[3px] rounded-full text-white bg-black/55 backdrop-blur-sm">
          {entry.aspectRatio}
        </span>
      </button>

      {/* Rodapé */}
      <div className="flex flex-col gap-[8px] p-[12px]">
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            onBlur={commitRename}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') commitRename();
              if (ev.key === 'Escape') {
                setDraft(entry.title);
                setRenaming(false);
              }
            }}
            className="w-full text-[13px] font-[700] px-[8px] py-[5px] rounded-[8px] bg-newBgColor border border-newBorder text-newTextColor outline-none"
            style={{ borderColor: 'var(--voc-rose)' }}
          />
        ) : (
          <span className="text-[13px] font-[700] leading-tight line-clamp-2 min-h-[34px]">
            {entry.title}
          </span>
        )}
        <span className="text-[11px] text-textItemBlur">{timeAgo(entry.updatedAt)}</span>

        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 text-[12px] font-[800] py-[7px] rounded-[9px] text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--voc-rose)' }}
          >
            Abrir
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicar"
            className="grid place-items-center w-[32px] h-[32px] rounded-[9px] bg-newBgColor border border-newBorder text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
          >
            <Copy size={15} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v);
                setConfirmDelete(false);
              }}
              title="Mais"
              className="grid place-items-center w-[32px] h-[32px] rounded-[9px] bg-newBgColor border border-newBorder text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-[calc(100%+6px)] z-[50] w-[180px] p-[6px] rounded-[10px] bg-newBgColorInner border border-newBorder shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDraft(entry.title);
                    setRenaming(true);
                  }}
                  className="flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px] text-[13px] font-[600] hover:bg-boxHover transition-colors text-left"
                >
                  <Pencil size={14} className="text-textItemBlur" />
                  Renomear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDelete) {
                      onDelete();
                      setMenuOpen(false);
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                  className="flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px] text-[13px] font-[600] hover:bg-boxHover transition-colors text-left"
                  style={{ color: '#f97066' }}
                >
                  <Trash2 size={14} />
                  {confirmDelete ? 'Confirmar exclusão?' : 'Excluir'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ onNew }: { onNew: () => void }) => (
  <div className="grid place-items-center text-center py-[80px]">
    <div className="flex flex-col items-center gap-[14px] max-w-[340px]">
      <span
        className="grid place-items-center w-[64px] h-[64px] rounded-[20px] text-white"
        style={{ background: 'var(--voc-aurora)' }}
      >
        <LayoutGrid size={28} />
      </span>
      <div className="flex flex-col gap-[4px]">
        <span className="text-[15px] font-[800]">Nenhum carrossel ainda</span>
        <span className="text-[13px] text-textItemBlur">
          Crie o primeiro carrossel desta marca/expert. Ele fica salvo aqui para você abrir,
          duplicar ou editar quando quiser.
        </span>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-[7px] text-[13px] font-[800] px-[18px] py-[10px] rounded-full text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--voc-aurora)', boxShadow: '0 8px 20px rgba(207,98,149,0.28)' }}
      >
        <Plus size={16} />
        Criar carrossel
      </button>
    </div>
  </div>
);

export default CarouselGallery;
