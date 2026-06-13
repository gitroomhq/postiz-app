'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Home, Settings, Lock } from 'lucide-react';

const WaffleDotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    {[3, 9, 15].flatMap((cx) =>
      [3, 9, 15].map((cy) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="currentColor" />
      ))
    )}
  </svg>
);

interface Module {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: FC<{ className?: string }>;
  locked: boolean;
  active?: boolean;
}

const HomeIcon: FC<{ className?: string }> = ({ className }) => (
  <Home className={className} />
);
const UsersIcon: FC<{ className?: string }> = ({ className }) => (
  <Users className={className} />
);
const SettingsIcon: FC<{ className?: string }> = ({ className }) => (
  <Settings className={className} />
);

const VolatisIcon: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M4 16l4-4 3 3 5-6 4 5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ReligareIcon: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 2v3M12 19v3M2 12h3M19 12h3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AugeoIcon: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M3 17l6-6 4 4 8-9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 8h4v4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MODULES: Module[] = [
  {
    id: 'hub',
    label: 'Hub',
    description: 'Dashboard & visão geral',
    href: '/hub',
    icon: HomeIcon,
    locked: false,
  },
  {
    id: 'crm',
    label: 'Clientes',
    description: 'CRM & projetos',
    href: '/hub/crm',
    icon: UsersIcon,
    locked: false,
  },
  {
    id: 'volatis',
    label: 'Volatis',
    description: 'Conteúdo & publicação',
    href: '/hub/volatis',
    icon: VolatisIcon,
    locked: true,
  },
  {
    id: 'religare',
    label: 'Religare',
    description: 'Análise vocacional',
    href: '/hub/religare',
    icon: ReligareIcon,
    locked: true,
  },
  {
    id: 'augeo',
    label: 'Augeo',
    description: 'Copy & crescimento',
    href: '/hub/augeo',
    icon: AugeoIcon,
    locked: true,
  },
  {
    id: 'settings',
    label: 'Config',
    description: 'Configurações',
    href: '/settings',
    icon: SettingsIcon,
    locked: false,
  },
];

const AURORA_ICONS = [
  'linear-gradient(135deg, #e89a7b, #cf6295)',
  'linear-gradient(135deg, #cf6295, #7360aa)',
  'linear-gradient(135deg, #7360aa, #2897bf)',
  'linear-gradient(135deg, #e89a7b, #7360aa)',
  'linear-gradient(135deg, #2897bf, #cf6295)',
  'linear-gradient(135deg, #cf6295, #e89a7b)',
];

export const WaffleMenu: FC = () => {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  const activeModule = MODULES.find(
    (m) => m.href !== '/launches' && pathname?.startsWith(m.href)
  );

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu de módulos"
        aria-expanded={open}
        className="relative flex items-center justify-center w-[32px] h-[32px] rounded-[8px] hover:text-newTextColor transition-colors duration-150"
        style={{ color: open ? 'var(--voc-rose)' : undefined }}
      >
        <WaffleDotsIcon />
        {activeModule && (
          <span
            className="absolute -bottom-[3px] -right-[3px] w-[7px] h-[7px] rounded-full"
            style={{ background: 'var(--voc-rose)' }}
          />
        )}
      </button>

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[9999] flex items-center justify-center mobile:items-end"
          style={{ background: 'rgba(32, 31, 29, 0.48)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === overlayRef.current) close();
          }}
        >
          <div
            className="relative w-full max-w-[420px] mobile:max-w-full mobile:rounded-b-none rounded-[var(--voc-radius-lg)] overflow-hidden animate-fade"
            style={{
              background: 'var(--voc-glass-strong)',
              backdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.72)',
              boxShadow: 'var(--voc-shadow-deep)',
              margin: '0 12px',
            }}
          >
            <div className="px-[24px] pt-[20px] pb-[8px] flex items-center justify-between">
              <div>
                <p
                  className="text-[10px] font-[900] tracking-[0.12em] uppercase mb-[2px]"
                  style={{ color: 'var(--voc-rose)' }}
                >
                  Vocaccio
                </p>
                <h2
                  className="text-[22px] font-[600] leading-none"
                  style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    color: 'var(--voc-ink)',
                  }}
                >
                  Módulos
                </h2>
              </div>
              <button
                onClick={close}
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[18px] leading-none"
                style={{
                  background: 'var(--voc-line)',
                  color: 'var(--voc-ink-soft)',
                }}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-[8px] p-[16px]">
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                const isCurrent =
                  pathname === mod.href ||
                  (mod.href !== '/launches' && pathname?.startsWith(mod.href));
                const content = (
                  <div
                    className="relative flex flex-col items-center gap-[10px] p-[16px] rounded-[var(--voc-radius-md)] transition-all duration-200"
                    style={{
                      background: isCurrent
                        ? 'rgba(207, 98, 149, 0.12)'
                        : 'rgba(255,255,255,0.52)',
                      border: isCurrent
                        ? '1px solid rgba(207, 98, 149, 0.32)'
                        : '1px solid rgba(255,255,255,0.68)',
                      opacity: mod.locked ? 0.62 : 1,
                      boxShadow: isCurrent ? '0 4px 18px rgba(207,98,149,0.14)' : undefined,
                    }}
                  >
                    {mod.locked && (
                      <Lock
                        size={12}
                        className="absolute top-[8px] right-[8px]"
                        style={{ color: 'var(--voc-ink-soft)' }}
                      />
                    )}
                    <div
                      className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center"
                      style={{ background: AURORA_ICONS[i] }}
                    >
                      <Icon className="w-[20px] h-[20px] text-white" />
                    </div>
                    <div className="text-center">
                      <p
                        className="text-[13px] font-[700] leading-tight"
                        style={{ color: 'var(--voc-ink)' }}
                      >
                        {mod.label}
                      </p>
                      <p
                        className="text-[10px] leading-tight mt-[2px]"
                        style={{ color: 'var(--voc-ink-soft)' }}
                      >
                        {mod.description}
                      </p>
                    </div>
                  </div>
                );

                return mod.locked ? (
                  <div key={mod.id} className="cursor-not-allowed">
                    {content}
                  </div>
                ) : (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    onClick={close}
                    className="hover:scale-[1.02] transition-transform duration-150"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            <div
              className="px-[24px] py-[14px] text-center text-[11px]"
              style={{ color: 'var(--voc-ink-soft)', borderTop: '1px solid var(--voc-line)' }}
            >
              Vocaccio Growth HUB · Soul 2 Soul
            </div>
          </div>
        </div>
      )}
    </>
  );
};
