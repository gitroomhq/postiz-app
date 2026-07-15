'use client';

import { CSSProperties, FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

// DBU System association selector for the composer. Cascading Client -> Active
// Project -> Monthly Cycle + Content Type, fed by the session-authed
// /dbu-options/* proxy (org-scoped). Defensive: renders nothing if the DBU
// integration is disabled or any fetch fails, so it can never block the composer
// for non-DBU content. The project list is the client's ACTIVE projects only
// (completed/cancelled/archived hidden) and is never inferred from the channel.

export interface DbuValue {
  clientId?: string;
  projectId?: string;
  milestoneId?: string;
  contentCycle?: string;
  contentType?: string;
}

interface Opt {
  id: string;
  name?: string;
  title?: string;
  cycle?: string;
}

const CONTENT_TYPES = [
  { v: 'static', l: 'Static post' },
  { v: 'carousel', l: 'Carousel' },
  { v: 'reel', l: 'Reel' },
  { v: 'story', l: 'Story' },
  { v: 'video', l: 'Video' },
];

const selStyle: CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid rgba(127,127,127,0.35)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  color: 'inherit',
  outline: 'none',
};

export const DbuAssociationPanel: FC<{
  value?: DbuValue | null;
  onChange: (v: DbuValue | null) => void;
}> = ({ value, onChange }) => {
  const fetch = useFetch();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [clients, setClients] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [cycles, setCycles] = useState<Opt[]>([]);
  const [clientId, setClientId] = useState(value?.clientId || '');
  const [projectId, setProjectId] = useState(value?.projectId || '');
  const [milestoneId, setMilestoneId] = useState(value?.milestoneId || '');
  const [contentType, setContentType] = useState(value?.contentType || '');

  const getJson = useCallback(
    async (url: string) => {
      try {
        const r = await fetch(url);
        return await r.json();
      } catch {
        return null;
      }
    },
    [fetch]
  );

  useEffect(() => {
    (async () => {
      const e = await getJson('/dbu-options/enabled');
      if (!e?.enabled) {
        setEnabled(false);
        return;
      }
      setEnabled(true);
      const c = await getJson('/dbu-options/clients');
      setClients(c?.clients || []);
    })();
  }, [getJson]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    (async () => {
      const p = await getJson(`/dbu-options/projects?clientId=${encodeURIComponent(clientId)}`);
      setProjects(p?.projects || []);
    })();
  }, [clientId, getJson]);

  useEffect(() => {
    if (!projectId) {
      setCycles([]);
      return;
    }
    (async () => {
      const c = await getJson(`/dbu-options/cycles?projectId=${encodeURIComponent(projectId)}`);
      setCycles(c?.cycles || []);
    })();
  }, [projectId, getJson]);

  useEffect(() => {
    if (!clientId) {
      onChange(null);
      return;
    }
    const cyc = cycles.find((x) => x.id === milestoneId);
    onChange({
      clientId,
      projectId: projectId || undefined,
      milestoneId: milestoneId || undefined,
      contentCycle: cyc?.cycle || undefined,
      contentType: contentType || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId, milestoneId, contentType, cycles]);

  if (enabled === false || enabled === null) return null;

  const incomplete = !!clientId && (!projectId || !milestoneId || !contentType);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: 8,
        border: '1px solid rgba(127,127,127,0.35)',
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600 }}>DBU association</div>
      <select
        style={selStyle}
        value={clientId}
        onChange={(e) => {
          setClientId(e.target.value);
          setProjectId('');
          setMilestoneId('');
        }}
      >
        <option value="">Select DBU client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {!!clientId && (
        <select
          style={selStyle}
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setMilestoneId('');
          }}
        >
          <option value="">Select active project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {!!projectId && (
        <select style={selStyle} value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
          <option value="">Select month / cycle…</option>
          {cycles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      )}
      {!!clientId && (
        <select style={selStyle} value={contentType} onChange={(e) => setContentType(e.target.value)}>
          <option value="">Select content type…</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
      )}
      {incomplete && (
        <div style={{ fontSize: 12, color: '#e57373' }}>
          Project, month/cycle and content type are required for DBU-managed content.
        </div>
      )}
    </div>
  );
};
