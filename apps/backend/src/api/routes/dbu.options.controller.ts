import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { createHmac } from 'crypto';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';

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
  constructor(private _integrationService: IntegrationService) {}

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
    // Response carries `approval_mode` per project (project override ?? client default).
    return callDbu('options/projects', { client_id: clientId, org_id: (req as any).org?.id });
  }

  @Get('cycles')
  async cycles(@Query('projectId') projectId: string) {
    if (!projectId) return { cycles: [] };
    return callDbu('options/cycles', { project_id: projectId });
  }

  // Permanent channel↔client map — drives composer auto-detection. DBU is source of
  // truth; we reconcile the mirror onto Integration.dbuClientId only when it drifts
  // (steady state = zero writes), so the emitter/scoping can read it locally too.
  @Get('channels')
  async channels(@Req() req: Request) {
    const orgId = (req as any).org?.id;
    if (!orgId) return { channels: [] };
    const resp = await callDbu('options/channels', { org_id: orgId });
    const channels: any[] = Array.isArray(resp?.channels) ? resp.channels : [];
    try {
      const list = await this._integrationService.getIntegrationsList(orgId);
      const byId = new Map(list.map((i: any) => [i.id, i]));
      for (const ch of channels) {
        const integ = byId.get(ch.channel_id);
        if (integ && integ.dbuClientId !== (ch.client_id || null)) {
          await this._integrationService.assignDbuClient(
            orgId,
            ch.channel_id,
            ch.client_id || null,
            ch.client_name || null
          );
        }
      }
    } catch (_) {
      // Best-effort mirror; auto-detection still works from the live map above.
    }
    return { channels };
  }

  // One-time admin link (create/refresh). Writes DBU social_channel_map + local mirror.
  @Post('channels/link')
  async linkChannel(@Body() body: any, @Req() req: Request) {
    const orgId = (req as any).org?.id;
    const channelId = String(body?.channelId || body?.channel_id || '');
    const clientId = String(body?.clientId || body?.client_id || '');
    if (!orgId || !channelId || !clientId) {
      return { ok: false, error: 'orgId, channelId and clientId required' };
    }
    const r = await callDbu('options/channels/link', {
      org_id: orgId,
      channel_id: channelId,
      client_id: clientId,
      provider: body?.provider || null,
      display_name: body?.displayName || body?.display_name || null,
      platform_account_id: body?.platformAccountId || body?.platform_account_id || null,
      customer_id: body?.customerId || body?.customer_id || null,
    });
    if (r?.ok) {
      try {
        await this._integrationService.assignDbuClient(
          orgId,
          channelId,
          clientId,
          r?.client_name || body?.clientName || null
        );
      } catch (_) {}
    }
    return r;
  }

  @Post('channels/unlink')
  async unlinkChannel(@Body() body: any, @Req() req: Request) {
    const orgId = (req as any).org?.id;
    const channelId = String(body?.channelId || body?.channel_id || '');
    if (!orgId || !channelId) return { ok: false, error: 'orgId and channelId required' };
    const r = await callDbu('options/channels/unlink', { channel_id: channelId });
    if (r?.ok) {
      try {
        await this._integrationService.assignDbuClient(orgId, channelId, null, null);
      } catch (_) {}
    }
    return r;
  }
}
