'use client';

import {
  CSSProperties,
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

// DBU System association selector for the composer. Cascading Client -> Active
// Project -> Monthly Cycle, fed by the session-authed /dbu-options/* proxy
// (org-scoped). Selecting a client AUTO-DETECTS its connected channels (the platform
// icons above light up) via the permanent channel↔client map. If a client has no
// linked channel yet, a one-time "link a channel" control appears — created once,
// reused forever, keyed by permanent channel ID (never names). Content type lives
// in the channel Settings, not here. Defensive: renders nothing if the DBU
// integration is disabled or any fetch fails, so it can never block non-DBU content.

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

interface OrgChannel {
  id: string;
  name?: string;
  identifier?: string;
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
  // The org's connected channels — used for the one-time "link a channel" control.
  integrations?: OrgChannel[];
}> = ({ value, onChange, onResolveChannels, integrations = [] }) => {
  const fetch = useFetch();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [clients, setClients] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [cycles, setCycles] = useState<Opt[]>([]);
  const [channelMap, setChannelMap] = useState<ChannelMapRow[]>([]);
  const [clientId, setClientId] = useState(value?.clientId || '');
  const [projectId, setProjectId] = useState(value?.projectId || '');
  const [milestoneId, setMilestoneId] = useState(value?.milestoneId || '');
  const [linkChannelId, setLinkChannelId] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const channelsRef = useRef(onResolveChannels);
  channelsRef.current = onResolveChannels;

  const getJson = useCallback(
    async (url: string, opts?: any) => {
      try {
        const r = await fetch(url, opts);
        return await r.json();
      } catch {
        return null;
      }
    },
    [fetch]
  );

  const loadChannels = useCallback(async () => {
    const ch = await getJson('/dbu-options/channels');
    setChannelMap(Array.isArray(ch?.channels) ? ch.channels : []);
  }, [getJson]);

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
      await loadChannels();
    })();
  }, [getJson, loadChannels]);

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

  const doLink = useCallback(async () => {
    if (!clientId || !linkChannelId) return;
    setLinking(true);
    setLinkError('');
    const integ = integrations.find((i) => i.id === linkChannelId);
    const r = await getJson('/dbu-options/channels/link', {
      method: 'POST',
      body: JSON.stringify({
        channelId: linkChannelId,
        clientId,
        provider: integ?.identifier || null,
        displayName: integ?.name || null,
      }),
    });
    setLinking(false);
    if (r?.ok) {
      setLinkChannelId('');
      await loadChannels(); // refresh the map -> auto-detect fires and lights the icon
    } else {
      setLinkError(r?.error || 'Could not link the channel.');
    }
  }, [clientId, linkChannelId, integrations, getJson, loadChannels]);

  if (enabled === false || enabled === null) return null;

  const incomplete = !!clientId && (!projectId || !milestoneId);
  const proj = projects.find((x) => x.id === projectId);
  const mode = proj?.approval_mode;
  const mappedForClient = channelMap.filter((c) => c.client_id === clientId);
  const needsLink = !!clientId && mappedForClient.length === 0;
  // Build a helpful label for each org channel (flag if already linked elsewhere).
  const clientNameById = (id: string) =>
    clients.find((c) => c.id === id)?.name || 'another client';
  const mapByChannel = new Map(channelMap.map((c) => [c.channel_id, c.client_id]));

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
          setLinkChannelId('');
          setLinkError('');
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
      {needsLink && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            borderRadius: 8,
            border: '1px dashed rgba(127,127,127,0.5)',
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            This client has no linked social account yet. Link one once — it’s
            remembered forever and its icon will light up automatically next time.
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              style={{ ...selStyle, flex: 1 }}
              value={linkChannelId}
              onChange={(e) => setLinkChannelId(e.target.value)}
            >
              <option value="">Select an account to link…</option>
              {integrations.map((i) => {
                const other = mapByChannel.get(i.id);
                return (
                  <option key={i.id} value={i.id}>
                    {i.name}
                    {i.identifier ? ` (${String(i.identifier).split('-')[0]})` : ''}
                    {other && other !== clientId
                      ? ` — now: ${clientNameById(other)}`
                      : ''}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              disabled={!linkChannelId || linking}
              onClick={doLink}
              style={{
                background: '#612BD3',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: !linkChannelId || linking ? 'not-allowed' : 'pointer',
                opacity: !linkChannelId || linking ? 0.7 : 1,
              }}
            >
              {linking ? 'Linking…' : 'Link'}
            </button>
          </div>
          {!!linkError && (
            <div style={{ fontSize: 12, color: '#e57373' }}>{linkError}</div>
          )}
        </div>
      )}
      {!!projectId && mode && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {mode === 'direct_schedule'
            ? '⚡ Direct scheduling — this project can post straight to the calendar.'
            : '✔ Approval required — use “Submit for Approval” to send it to the client portal first.'}
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
