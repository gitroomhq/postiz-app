import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

/**
 * Debug endpoints for testing SSO middleware behavior
 * IMPORTANT: Only enable in development/test environments
 */
@Controller('debug')
export class DebugController {
  @Get('auth')
  debugAuth(@Req() req: Request) {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return { error: 'Debug endpoints disabled in production' };
    }

    return {
      user: (req as any).user ? {
        id: (req as any).user.id,
        email: (req as any).user.email,
        name: (req as any).user.name,
        activated: (req as any).user.activated,
      } : null,
      org: (req as any).org ? {
        id: (req as any).org.id,
        name: (req as any).org.name,
      } : null,
      headers: {
        'remote-email': req.headers['remote-email'],
        'remote-user': req.headers['remote-user'],
        'remote-name': req.headers['remote-name'],
        'remote-groups': req.headers['remote-groups'],
        'cookie': req.headers.cookie ? '[present]' : '[absent]',
        'authorization': req.headers.authorization ? '[present]' : '[absent]',
      },
      sso: {
        enabled: process.env.ENABLE_SSO === 'true',
        trustProxy: process.env.SSO_TRUST_PROXY === 'true',
        mode: process.env.SSO_MODE,
        sharedSecretConfigured: !!process.env.SSO_SHARED_SECRET,
      },
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    };
  }
}
