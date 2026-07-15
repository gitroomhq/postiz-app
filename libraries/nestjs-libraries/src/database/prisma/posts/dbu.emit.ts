import { createHmac } from 'crypto';

// DBU System integration: emit a signed content.upsert to the DBU webhook when a
// post carries a DBU association. Fire-and-forget from the caller; failures are
// logged on the DBU side (social_sync_log) and can be retried. Signing matches the
// DBU verifier: HMAC-SHA256 over `${ts}.${canonical(payload)}` (sorted-key), header
// X-MO-Timestamp (ms) + X-MO-Signature (hex). Secret = env DBU_INTEGRATION_SECRET.

function canonical(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return (
    '{' +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonical(v[k]))
      .join(',') +
    '}'
  );
}

function mediaUrls(imageJson?: string | null): string[] {
  try {
    const arr = JSON.parse(imageJson || '[]');
    return Array.isArray(arr) ? arr.map((m: any) => m?.path).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function emitDbuContentUpsert(opts: {
  post: any;
  dbu?: any;
  provider?: string;
  orgId: string;
}): Promise<{ ok: boolean; status?: number; contentItemId?: string; error?: string }> {
  const url = process.env.DBU_WEBHOOK_URL || '';
  const secret = process.env.DBU_INTEGRATION_SECRET || '';
  const { post, dbu, provider, orgId } = opts;
  if (!url || !secret || !dbu?.clientId) {
    return { ok: false, error: 'not_configured_or_no_association' };
  }

  const payload = {
    event: 'content.upsert',
    idempotency_key: `${post.id}:${new Date(post.updatedAt || post.createdAt || Date.now()).getTime()}`,
    post: {
      id: post.id,
      group: post.group,
      org_id: orgId,
      channel_id: post.integrationId,
      provider: provider || null,
      content: post.content || '',
      media_urls: mediaUrls(post.image),
      post_type: dbu.contentType || null,
      state: post.state,
      approval_status: post.approvalStatus,
      publish_date: post.publishDate ? new Date(post.publishDate).toISOString() : null,
      release_url: post.releaseURL || null,
      release_id: post.releaseId || null,
      error: post.error || null,
      dbu: {
        client_id: dbu.clientId,
        project_id: dbu.projectId || null,
        milestone_id: dbu.milestoneId || null,
        content_cycle: dbu.contentCycle || null,
      },
    },
  };
  const ts = Date.now().toString();
  const sig = createHmac('sha256', secret).update(`${ts}.${canonical(payload)}`).digest('hex');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-MO-Timestamp': ts, 'X-MO-Signature': sig },
      body: JSON.stringify(payload),
    });
    const j: any = await res.json().catch(() => ({}));
    return { ok: res.ok && j?.ok !== false, status: res.status, contentItemId: j?.content_item_id, error: j?.error };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'fetch_failed' };
  }
}
