'use client';

import { useState } from 'react';
import { X, FolderPlus, Sparkles } from 'lucide-react';
import { deriveBrandKit } from '@gitroom/carousel-engine';
import { copyProjectConfig, saveBrandDefaults } from './carousel-store';
import type { ProjectOption } from './project-settings.component';

/**
 * Adicionar projeto à galeria de carrosséis. Um "projeto" é um cliente do CRM —
 * mas só aparece na galeria quando ativado (tem carrossel ou config). Aqui o
 * usuário escolhe um cliente existente OU cria um novo, opcionalmente herdando a
 * config de outro projeto, e em seguida cai no setup de config (decisão Felipe
 * 2026-06-19, ver [[feedback-plan-before-building]]).
 */
interface AddProjectModalProps {
  /** Clientes CRM ainda não ativados como projeto de carrossel. */
  existingUnactivated: ProjectOption[];
  /** Projetos já ativados (para "herdar config de…"). */
  activatedProjects: ProjectOption[];
  /** Cria um cliente CRM novo e devolve o id/nome. */
  onCreateClient: (name: string) => Promise<ProjectOption>;
  /** Projeto pronto (ativado) — galeria seleciona e abre o setup de config. */
  onDone: (clientId: string) => void;
  onClose: () => void;
}

export const AddProjectModal = ({
  existingUnactivated,
  activatedProjects,
  onCreateClient,
  onDone,
  onClose,
}: AddProjectModalProps) => {
  const [mode, setMode] = useState<'existing' | 'new'>(
    existingUnactivated.length > 0 ? 'existing' : 'new'
  );
  const [selectedExisting, setSelectedExisting] = useState('');
  const [newName, setNewName] = useState('');
  const [inheritFrom, setInheritFrom] = useState('');
  const [busy, setBusy] = useState(false);

  const canConfirm =
    !busy && (mode === 'existing' ? !!selectedExisting : !!newName.trim());

  const confirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      let clientId: string;
      if (mode === 'new') {
        const created = await onCreateClient(newName.trim());
        clientId = created.id;
      } else {
        clientId = selectedExisting;
      }
      // ativa o projeto: herda a config de outro OU grava o kit padrão Vocaccio
      if (inheritFrom) copyProjectConfig(inheritFrom, clientId);
      else saveBrandDefaults(clientId, deriveBrandKit({}));
      onDone(clientId);
    } catch {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-[24px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-[440px] rounded-[16px] bg-newBgColorInner border border-newBorder overflow-hidden">
        <div className="flex items-center gap-[10px] px-[20px] h-[58px] shrink-0 border-b border-newBorder">
          <span
            className="grid place-items-center w-[30px] h-[30px] rounded-[9px] text-white"
            style={{ background: 'var(--voc-aurora)' }}
          >
            <FolderPlus size={16} />
          </span>
          <span className="text-[14px] font-[800] flex-1">Adicionar marca/expert</span>
          <button
            type="button"
            onClick={onClose}
            className="grid place-items-center w-[30px] h-[30px] rounded-[8px] text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-[18px] p-[20px]">
          {/* Toggle origem */}
          <div className="flex gap-[6px]">
            {existingUnactivated.length > 0 && (
              <ModeButton active={mode === 'existing'} onClick={() => setMode('existing')}>
                Marca/Expert existente
              </ModeButton>
            )}
            <ModeButton active={mode === 'new'} onClick={() => setMode('new')}>
              Nova marca/expert
            </ModeButton>
          </div>

          {mode === 'existing' ? (
            <label className="flex flex-col gap-[5px]">
              <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                Escolher marca/expert existente
              </span>
              <select
                value={selectedExisting}
                onChange={(e) => setSelectedExisting(e.target.value)}
                className="w-full text-[13px] px-[10px] py-[9px] rounded-[10px] bg-newBgColor border border-newBorder text-newTextColor outline-none"
              >
                <option value="" disabled>
                  Selecionar…
                </option>
                {existingUnactivated.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-[5px]">
              <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                Nome da nova marca/expert
              </span>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirm();
                }}
                placeholder="Ex: Camila Caeron"
                className="w-full text-[13px] px-[10px] py-[9px] rounded-[10px] bg-newBgColor border border-newBorder text-newTextColor outline-none placeholder:text-textItemBlur"
              />
            </label>
          )}

          {/* Herdar config */}
          {activatedProjects.length > 0 && (
            <label className="flex flex-col gap-[5px]">
              <span className="flex items-center gap-[5px] text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                <Sparkles size={12} />
                Herdar configurações de (opcional)
              </span>
              <select
                value={inheritFrom}
                onChange={(e) => setInheritFrom(e.target.value)}
                className="w-full text-[13px] px-[10px] py-[9px] rounded-[10px] bg-newBgColor border border-newBorder text-newTextColor outline-none"
              >
                <option value="">Começar do padrão Vocaccio</option>
                {activatedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-textItemBlur leading-[1.4]">
                Copia cores, campos globais e fontes favoritas como ponto de partida — você ajusta no
                próximo passo.
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-[10px] px-[20px] h-[64px] shrink-0 border-t border-newBorder">
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-[700] px-[14px] h-[38px] rounded-[10px] border border-newBorder text-textItemBlur hover:bg-boxHover transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="text-[13px] font-[800] px-[18px] h-[38px] rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--voc-aurora)' }}
          >
            {busy ? 'Criando…' : 'Criar e configurar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ModeButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-1 text-[12px] font-[700] px-[12px] py-[9px] rounded-[10px] border transition-colors"
    style={
      active
        ? { borderColor: 'var(--voc-rose)', background: 'rgba(207,98,149,0.12)', color: 'var(--voc-rose)' }
        : { borderColor: 'var(--new-border)', background: 'transparent', color: 'var(--new-textColor)' }
    }
  >
    {children}
  </button>
);
