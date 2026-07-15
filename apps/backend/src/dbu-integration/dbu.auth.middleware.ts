import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

// DBU System <-> Mapped Out integration: verifies HMAC-signed server-to-server
// requests from the DBU API server. Signature = HMAC-SHA256(secret,
// `${timestamp}.${canonicalJSON(body)}`) over a sorted-key serialization so both
// Node services verify identically without depending on raw-body plumbing.
// Shared secret = env DBU_INTEGRATION_SECRET (same value as DBU's
// MAPPED_OUT_SIGNING_SECRET). No user/session is established — the route runs
// with no req.org/req.user, which the global RolesGuard/PoliciesGuard allow.

const WINDOW_MS = 5 * 60 * 1000;

export function canonical(v: any): string {
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

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a || '', 'hex');
    const bb = Buffer.from(b || '', 'hex');
    return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

@Injectable()
export class DbuAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const secret = process.env.DBU_INTEGRATION_SECRET || '';
    if (!secret) {
      res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ ok: false, error: 'integration_not_configured' });
      return;
    }
    const ts = String(req.headers['x-mo-timestamp'] || '');
    const sig = String(req.headers['x-mo-signature'] || '');
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > WINDOW_MS) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ ok: false, error: 'stale_or_bad_timestamp' });
      return;
    }
    const expected = createHmac('sha256', secret)
      .update(`${ts}.${canonical((req as any).body || {})}`)
      .digest('hex');
    if (!safeEqualHex(expected, sig)) {
      res.status(HttpStatus.UNAUTHORIZED).json({ ok: false, error: 'bad_signature' });
      return;
    }
    next();
  }
}
