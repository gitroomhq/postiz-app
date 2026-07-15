import { Body, Controller, Post } from '@nestjs/common';

// DBU System <-> Mapped Out Social Studio integration controller.
// Mounted at `/dbu/v1` (externally `https://<host>/api/dbu/v1/*` — nginx strips
// `/api`). Authenticated by DbuAuthMiddleware (HMAC signature), NOT the public
// API key. Runs with no req.org/req.user, which the global guards allow.
//
// Phase 1: `health` — the DBU Settings "Test connection" does a signed
// round-trip here; "Connected" is only shown after this succeeds. Phase 2/3 add
// approval / comment / schedule / cancel endpoints (DBU -> Mapped Out).
@Controller('dbu/v1')
export class DbuIntegrationController {
  @Post('health')
  health(@Body() body: any) {
    const org = process.env.DBU_ORG_ID || '';
    // Confirm the caller targeted THIS org (defends against a misconfigured target).
    if (body?.orgId && org && body.orgId !== org) {
      return { ok: false, error: 'org_mismatch' };
    }
    return {
      ok: true,
      org,
      name: 'Mapped Out Social Studio',
      version: process.env.NEXT_PUBLIC_VERSION || 'unknown',
      at: Date.now(),
    };
  }
}
