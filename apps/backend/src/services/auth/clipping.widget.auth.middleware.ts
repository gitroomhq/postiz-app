import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClippingService } from '@gitroom/nestjs-libraries/database/prisma/clipping/clipping.service';

// The MCP clipping widget runs in the host's sandboxed iframe (a foreign origin
// without our cookies), so it authenticates with a short-lived ticket that only
// opens the clipping it was made for
@Injectable()
export class ClippingWidgetAuthMiddleware implements NestMiddleware {
  constructor(private _clippingService: ClippingService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    // Not part of the global cors() allowlist on purpose: that one allows
    // credentials, and the sandbox origins are shared with every other connector.
    // The global cors() answers every preflight itself, so the widget has to stay
    // on "simple" requests (GET, no custom headers)
    res.setHeader('Access-Control-Allow-Origin', '*');

    const ticket =
      typeof req.query.ticket === 'string' &&
      (await this._clippingService.getWidgetTicket(req.query.ticket));
    if (!ticket) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ msg: 'Clipping ticket not found or expired' });
      return;
    }

    // @ts-ignore
    req.org = { id: ticket.org };
    // @ts-ignore
    req.clippingId = ticket.id;
    next();
  }
}
