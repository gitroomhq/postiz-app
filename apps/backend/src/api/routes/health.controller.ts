// Modified by SocialFlow on 2026-04-30
//
// Health-check endpoint required by Phase 1 INFRA-09 (BetterStack uptime monitor)
// and AGPL `/source` redirect (D-06). Returns the running commit SHA so external
// monitors and the AGPL `/source` route can confirm what code is deployed.
//
// Postiz upstream did not ship a /health endpoint as of v2.21.7 — this is new
// SocialFlow code added to the fork.

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { ok: true; commit: string } {
    return {
      ok: true,
      commit: process.env.BUILD_COMMIT_SHA || 'unknown',
    };
  }
}
