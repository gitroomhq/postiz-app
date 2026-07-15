import { Body, Controller, Post } from '@nestjs/common';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';

// DBU System <-> Mapped Out Social Studio integration controller.
// Mounted at `/dbu/v1` (externally `https://<host>/api/dbu/v1/*` — nginx strips
// `/api`). Authenticated by DbuAuthMiddleware (HMAC signature), NOT the public
// API key. Runs with no req.org/req.user, which the global guards allow.
@Controller('dbu/v1')
export class DbuIntegrationController {
  constructor(private readonly _posts: PostsRepository) {}

  // Phase 1: the DBU Settings "Test connection" does a signed round-trip here.
  @Post('health')
  health(@Body() body: any) {
    const org = process.env.DBU_ORG_ID || '';
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

  // Phase 3: the DBU portal's OFFICIAL client decision -> mirror onto the post's
  // approvalStatus so Mapped Out displays it. DBU remains authoritative; this only
  // sets the state (the comment is preserved on the DBU side). No Postiz user is
  // fabricated — the approval history lives in DBU (portal_comments + audit_logs).
  @Post('approval')
  async approval(@Body() body: any) {
    const action = String(body?.action || '').toUpperCase();
    if (!['APPROVED', 'NEEDS_CHANGES', 'REJECTED'].includes(action)) {
      return { ok: false, error: 'bad_action' };
    }
    if (!body?.postId) {
      return { ok: false, error: 'missing_post' };
    }
    try {
      await this._posts.setApprovalStatus(String(body.postId), action);
      return { ok: true, postId: body.postId, approvalStatus: action };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'failed' };
    }
  }

  // Phase 4: mirror a client discussion comment from the DBU portal onto the post,
  // so the Mapped Out operator can see client feedback. Stored as JSON (no Postiz
  // user fabricated). DBU remains the authoritative discussion record.
  @Post('comment')
  async comment(@Body() body: any) {
    if (!body?.postId || !body?.comment) {
      return { ok: false, error: 'missing_post_or_comment' };
    }
    try {
      await this._posts.appendDbuDiscussion(String(body.postId), {
        author: String(body.authorName || 'Client'),
        comment: String(body.comment),
        at: new Date().toISOString(),
      });
      return { ok: true, postId: body.postId };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'failed' };
    }
  }
}
