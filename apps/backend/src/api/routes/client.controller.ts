import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { ClientAllowed } from '@gitroom/backend/services/auth/permissions/roles.guard';

/**
 * Mapped Out Client Portal (Phase 2B).
 *
 * Read + approve + comment surface for Clients. Every route is @ClientAllowed
 * (clients are default-denied everywhere else) AND additionally scoped to the
 * channels the client is assigned to, so a client can only ever see/act on
 * their own content.
 */
@ApiTags('Client')
@Controller('/client')
export class ClientController {
  constructor(
    private _postsService: PostsService,
    private _integrationService: IntegrationService
  ) {}

  private async allowedIntegrationIds(user: User, orgId: string) {
    const scope = await this._integrationService.getScope(user, orgId);
    return scope.all
      ? await this._integrationService.getAllIntegrationIds(orgId)
      : scope.integrationIds;
  }

  private async assertCanAccessPost(user: User, orgId: string, postId: string) {
    const scope = await this._integrationService.getScope(user, orgId);
    const post = await this._postsService.getPostIfAllowed(postId, orgId, scope);
    if (!post) {
      throw new ForbiddenException();
    }
    return post;
  }

  @Get('/posts')
  @ClientAllowed()
  async posts(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User
  ) {
    const allowed = await this.allowedIntegrationIds(user, org.id);
    return { posts: await this._postsService.getClientPosts(org.id, allowed) };
  }

  @Get('/posts/:id/comments')
  @ClientAllowed()
  async getComments(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    await this.assertCanAccessPost(user, org.id, id);
    return { comments: await this._postsService.getComments(id) };
  }

  @Post('/posts/:id/comments')
  @ClientAllowed()
  async addComment(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body() body: { comment: string }
  ) {
    await this.assertCanAccessPost(user, org.id, id);
    if (!body?.comment || body.comment.trim().length < 1) {
      throw new ForbiddenException();
    }
    return this._postsService.createComment(org.id, user.id, id, body.comment);
  }

  @Get('/posts/:id/approvals')
  @ClientAllowed()
  async getApprovals(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    await this.assertCanAccessPost(user, org.id, id);
    return { approvals: await this._postsService.getApprovals(id) };
  }

  @Post('/posts/:id/approval')
  @ClientAllowed()
  async setApproval(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body() body: { action: string; comment?: string }
  ) {
    await this.assertCanAccessPost(user, org.id, id);
    const action = (body?.action || '').toUpperCase();
    if (!['APPROVED', 'REJECTED', 'NEEDS_CHANGES'].includes(action)) {
      throw new ForbiddenException();
    }
    return this._postsService.setApproval(
      org.id,
      user.id,
      id,
      action as 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES',
      body.comment
    );
  }
}
