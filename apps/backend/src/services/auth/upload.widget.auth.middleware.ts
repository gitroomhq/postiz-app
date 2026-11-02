import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';

// The MCP upload widget runs in the host's sandboxed iframe (a foreign origin
// without our cookies), so it authenticates with a short-lived ticket. It is
// checked here, before the multipart interceptor streams anything to storage
@Injectable()
export class UploadWidgetAuthMiddleware implements NestMiddleware {
  constructor(private _mediaService: MediaService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    // Not part of the global cors() allowlist on purpose: that one allows
    // credentials, and the sandbox origins are shared with every other connector.
    // The global cors() answers every preflight itself, so the widget has to stay
    // on "simple" requests (GET / multipart POST, no custom headers)
    res.setHeader('Access-Control-Allow-Origin', '*');

    const ticket =
      typeof req.query.ticket === 'string' &&
      (await this._mediaService.getUploadTicket(req.query.ticket));
    if (!ticket) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ msg: 'Upload ticket not found or expired' });
      return;
    }

    // @ts-ignore
    req.org = { id: ticket.org };
    // @ts-ignore
    req.uploadSession = ticket.sessionId;
    next();
  }
}
