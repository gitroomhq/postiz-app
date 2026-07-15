'use client';

import { CSSProperties, FC, useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

// DBU System association selector for the composer. Cascading Client -> Active
// Project -> Monthly Cycle, fed by the session-authed /dbu-options/* proxy
// (org-scoped). Selecting a client also AUTO-DETECTS its connected channels (the
// platform icons above light up) via the permanent channel↔client map — the
// operator never re-selects the same account. Content type lives once in the
// composer settings, not here. Defensive: renders nothing if the DBU integration
// is disabled or any fetch fails, so it can never block non-DBU content.

export interface DbuValue {
  clientId?: string;
  projectId?: string;
  milestoneId?: string;
  contentCycle?: string;
  // Resolved Approval Mode of the selected project (project override ?? client
  // default): 'client_approval' | 'direct_schedule'.
  approvalMode?: string;
}

interface Opt {
  id: string;
  name?: string;
  title?: string;
  cycle?: string;
  approval_mode?: string;
}

interface ChannelMapRow {
  channel_id: string;
  client_id: string;
  provider?: string;
  display_name?: string;
}

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
  // Called when the selected client's connected channels are resolved, so the
  // composer can auto-activate the matching platform icons.
  onResolveChannels?: (clientId: string | null, channelIds: string[]) => void;
}> = ({ value, onChange, onResolveChannels }) => {
  const fetch = useFetch();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [clients, setClients] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [cycles, setCycles] = useState<Opt[]>([]);
  const [channelMap, setChannelMap] = useState<ChannelMapRow[]>([]);
  const [clientId, setClientId] = useState(value?.clientId || '');
  const [projectId, setProjectId] = useState(value?.projectId || '');
  const [milestoneId, setMilestoneId] = useState(value?.milestoneId || '');
  const channelsRef = useRef(onResolveChannels);
  channelsRef.current = onResolveChannels;

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
      const ch = await getJson('/dbu-options/channels');
      setChannelMap(Array.isArray(ch?.channels) ? ch.channels : []);
    })();
  }, [getJson]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    (async () => {
      const p = await getJson(
        `/dbu-options/projects?clientId=${encodeURIComponent(clientId)}`
      );
      setProjects(p?.projects || []);
    })();
  }, [clientId, getJson]);

  useEffect(() => {
    if (!projectId) {
      setCycles([]);
      return;
    }
    (async () => {
      const c = await getJson(
        `/dbu-options/cycles?projectId=${encodeURIComponent(projectId)}`
      );
      setCycles(c?.cycles || []);
    })();
  }, [projectId, getJson]);

  // Auto-detect the client's channels whenever the client (or the map) resolves.
  useEffect(() => {
    if (!clientId) {
      channelsRef.current?.(null, []);
      return;
    }
    const ids = channelMap
      .filter((c) => c.client_id === clientId)
      .map((c) => c.channel_id);
    channelsRef.current?.(clientId, ids);
  }, [clientId, channelMap]);

  useEffect(() => {
    if (!clientId) {
      onChange(null);
      return;
    }
    const cyc = cycles.find((x) => x.id === milestoneId);
    const proj = projects.find((x) => x.id === projectId);
    onChange({
      clientId,
      projectId: projectId || undefined,
      milestoneId: milestoneId || undefined,
      contentCycle: cyc?.cycle || undefined,
      approvalMode: proj?.approval_mode || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId, milestoneId, cycles, projects]);

  if (enabled === false || enabled === null) return null;

  const incomplete = !!clientId && (!projectId || !milestoneId);
  const proj = projects.find((x) => x.id === projectId);
  const mode = proj?.approval_mode;

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
        <select
          style={selStyle}
          value={milestoneId}
          onChange={(e) => setMilestoneId(e.target.value)}
        >
          <option value="">Select month / cycle…</option>
          {cycles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      )}
      {!!projectId && mode && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {mode === 'direct_schedule'
            ? '⚡ Direct scheduling — this project posts straight to the calendar.'
            : '✔ Approval required — posts are sent to the client portal for approval first.'}
        </div>
      )}
      {incomplete && (
        <div style={{ fontSize: 12, color: '#e57373' }}>
          Project and month/cycle are required for DBU-managed content.
        </div>
      )}
    </div>
  );
};
