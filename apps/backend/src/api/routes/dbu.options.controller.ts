import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { createHmac } from 'crypto';

// DBU System integration — session-authed proxy that feeds the composer's
// DBU Client / Active Project / Cycle selectors. The logged-in employee's org
// (req.org) scopes the results, so an employee only ever sees the DBU clients
// mapped to their own workspace — they never receive a DBU token or any private
// DBU data. This proxy signs a server-to-server request to the DBU option
// endpoints (HMAC, DBU_INTEGRATION_SECRET) and returns only the whitelisted lists.

function canonical(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

async function callDbu(path: string, body: any): Promise<any> {
  const base = (process.env.DBU_WEBHOOK_URL || '').replace(/\/webhook\/?$/, '');
  const secret = process.env.DBU_INTEGRATION_SECRET || '';
  if (!base || !secret) return { error: 'not_configured' };
  const ts = Date.now().toString();
  const sig = createHmac('sha256', secret).update(`${ts}.${canonical(body)}`).digest('hex');
  try {
    const res = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-MO-Timestamp': ts, 'X-MO-Signature': sig },
      body: JSON.stringify(body),
    });
    return await res.json().catch(() => ({}));
  } catch (e: any) {
    return { error: e?.message || 'fetch_failed' };
  }
}

@Controller('dbu-options')
export class DbuOptionsController {
  @Get('enabled')
  enabled() {
    return { enabled: !!(process.env.DBU_INTEGRATION_SECRET && process.env.DBU_WEBHOOK_URL) };
  }

  @Get('clients')
  async clients(@Req() req: Request) {
    const orgId = (req as any).org?.id;
    return callDbu('options/clients', { org_id: orgId });
  }

  @Get('projects')
  async projects(@Query('clientId') clientId: string, @Req() req: Request) {
    if (!clientId) return { projects: [] };
    return callDbu('options/projects', { client_id: clientId, org_id: (req as any).org?.id });
  }

  @Get('cycles')
  async cycles(@Query('projectId') projectId: string) {
    if (!projectId) return { cycles: [] };
    return callDbu('options/cycles', { project_id: projectId });
  }
}
