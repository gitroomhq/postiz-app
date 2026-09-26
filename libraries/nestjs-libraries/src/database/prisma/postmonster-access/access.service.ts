import { HttpException, Injectable } from '@nestjs/common';
import { AccessRequest, AccessInvite } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import dayjs from 'dayjs';
import { AccessRepository } from '@gitroom/nestjs-libraries/database/prisma/postmonster-access/access.repository';
import { accessEmails } from '@gitroom/nestjs-libraries/database/prisma/postmonster-access/access.emails';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import {
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreateAccessRequestDto } from '@gitroom/nestjs-libraries/dtos/access/create.access.request.dto';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';

// postmonster: closed access business logic (PRD 6). Invite tokens are
// crypto-random and only their sha256 hash is stored, so a database leak
// never hands out working registration links.
export const ACCESS_INVITE_TTL_DAYS = 7;

export const normalizeEmail = (email: string) =>
  String(email || '').trim().toLowerCase();

export const hashAccessToken = (token: string) =>
  createHash('sha256').update(String(token || '')).digest('hex');

// only a hash of the client IP is stored (PRD 6.2)
export const hashIp = (ip: string) =>
  createHash('sha256')
    .update(`postmonster:access:${String(ip || '')}`)
    .digest('hex');

export type InviteStatus = 'active' | 'used' | 'expired' | 'revoked';

export type RegisterWithInviteBody = Omit<
  CreateOrgUserDto,
  'providerToken' | 'inviteToken'
> & { providerId?: string };

@Injectable()
export class AccessService {
  constructor(
    private _accessRepository: AccessRepository,
    private _organizationService: OrganizationService,
    private _emailService: EmailService,
    private _transaction: PrismaTransaction
  ) {}

  private inviteUrl(token: string) {
    return `${process.env.FRONTEND_URL}/auth/register?invite=${encodeURIComponent(
      token
    )}`;
  }

  static inviteStatus(
    invite: Pick<AccessInvite, 'expiresAt' | 'usedAt' | 'revokedAt'>
  ): InviteStatus {
    if (invite.usedAt) return 'used';
    if (invite.revokedAt) return 'revoked';
    if (dayjs(invite.expiresAt).isBefore(dayjs())) return 'expired';
    return 'active';
  }

  // Landing submission. Deduplicated on purpose: a repeat while the first
  // request is still pending is not a new row, but the caller always gets the
  // same generic success so the response never reveals anything about the email
  async submitRequest(
    input: CreateAccessRequestDto,
    meta: { ipHash?: string; userAgent?: string }
  ) {
    const email = normalizeEmail(input.email);
    const existing = await this._accessRepository.findPendingRequestByEmail(
      email
    );
    if (existing) {
      return { ok: true };
    }

    const created = await this._accessRepository.createRequest({
      name: input.name.trim(),
      email,
      role: input.role?.trim() || null,
      networks: input.networks || [],
      teamSize: input.teamSize?.trim() || null,
      useCase: input.useCase?.trim() || null,
      ipHash: meta.ipHash || null,
      userAgent: meta.userAgent || null,
    });

    await this._emailService.sendEmailSync(
      email,
      "We've received your request",
      accessEmails.requestReceived(created.name)
    );

    const operatorEmail = process.env.OPERATOR_EMAIL;
    if (operatorEmail) {
      await this._emailService.sendEmailSync(
        operatorEmail,
        `New access request: ${email}`,
        accessEmails.requestOperator(created)
      );
    } else {
      console.log('OPERATOR_EMAIL is not set, skipping operator notification');
    }

    return { ok: true };
  }

  listRequests(params: {
    page?: number;
    limit?: number;
    status?: any;
    email?: string;
  }) {
    return this._accessRepository.listRequests(params);
  }

  listInvites() {
    return this._accessRepository.listInvites().then((invites) =>
      invites.map((invite) => ({
        ...invite,
        status: AccessService.inviteStatus(invite),
      }))
    );
  }

  listUsers(page?: number, limit?: number) {
    return this._accessRepository.listUsers(page || 0, limit || 20);
  }

  private async createInviteForEmail(
    email: string,
    createdBy?: string | null,
    accessRequestId?: string | null
  ) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = dayjs().add(ACCESS_INVITE_TTL_DAYS, 'day').toDate();
    await this._accessRepository.createInvite({
      email: normalizeEmail(email),
      tokenHash: hashAccessToken(token),
      expiresAt,
      createdBy: createdBy || null,
      accessRequestId: accessRequestId || null,
    });
    return { token, expiresAt };
  }

  private async sendInviteEmail(email: string, token: string) {
    await this._emailService.sendEmailSync(
      normalizeEmail(email),
      "You're in - set up your Postmonster account",
      accessEmails.invite(token)
    );
  }

  // Approve -> one-time invite (7 days) + "You're in" email with the register link
  async approveRequest(requestId: string, reviewedById?: string) {
    const request = await this._accessRepository.getRequestById(requestId);
    if (!request) {
      throw new HttpException('Request not found', 404);
    }
    if (request.status !== 'PENDING') {
      throw new HttpException('Request is already reviewed', 400);
    }

    const { token, expiresAt } = await this.createInviteForEmail(
      request.email,
      reviewedById,
      request.id
    );
    await this._accessRepository.updateRequestStatus(
      requestId,
      'APPROVED',
      reviewedById
    );
    await this.sendInviteEmail(request.email, token);

    return {
      request: { ...request, status: 'APPROVED' as const },
      invite: { email: request.email, expiresAt },
    };
  }

  async rejectRequest(
    requestId: string,
    reviewedById?: string,
    sendEmail = true
  ) {
    const request = await this._accessRepository.getRequestById(requestId);
    if (!request) {
      throw new HttpException('Request not found', 404);
    }
    if (request.status !== 'PENDING') {
      throw new HttpException('Request is already reviewed', 400);
    }

    await this._accessRepository.updateRequestStatus(
      requestId,
      'REJECTED',
      reviewedById
    );
    if (sendEmail) {
      await this._emailService.sendEmailSync(
        request.email,
        'About your Postmonster access request',
        accessEmails.rejected()
      );
    }
    return { ok: true };
  }

  async createInviteManually(email: string, createdBy?: string) {
    const normalized = normalizeEmail(email);
    const { token, expiresAt } = await this.createInviteForEmail(
      normalized,
      createdBy
    );
    await this.sendInviteEmail(normalized, token);
    return { email: normalized, expiresAt };
  }

  // Resend = a brand new token; the previous one is revoked in the same breath,
  // so an email forwarded to the wrong inbox stops working immediately
  async resendInvite(inviteId: string) {
    const invite = await this._accessRepository.findInviteById(inviteId);
    if (!invite) {
      throw new HttpException('Invite not found', 404);
    }
    if (invite.usedAt) {
      throw new HttpException('Invite is already used', 400);
    }

    await this._accessRepository.revokeInvite(inviteId);
    const { token, expiresAt } = await this.createInviteForEmail(
      invite.email,
      invite.createdBy,
      invite.accessRequestId
    );
    await this.sendInviteEmail(invite.email, token);
    return { email: invite.email, expiresAt };
  }

  async revokeInvite(inviteId: string) {
    const invite = await this._accessRepository.findInviteById(inviteId);
    if (!invite) {
      throw new HttpException('Invite not found', 404);
    }
    if (invite.usedAt) {
      throw new HttpException('Invite is already used', 400);
    }
    await this._accessRepository.revokeInvite(inviteId);
    return { ok: true };
  }

  // Used by the register form to prefill the readonly email. The token itself
  // is the credential, so a valid token may learn its own email
  async getInviteByToken(token: string) {
    const invite = await this._accessRepository.findInviteByTokenHash(
      hashAccessToken(token)
    );
    if (
      !invite ||
      AccessService.inviteStatus(invite) !== 'active'
    ) {
      throw new HttpException(
        'This invite link is invalid or has expired',
        400
      );
    }
    return { email: invite.email };
  }

  // Registration with an invite: consume the token and create the user + their
  // own workspace in one transaction, so a crash can never leave a burnt
  // invite without an account (or a free second registration)
  async registerWithInviteToken(
    body: RegisterWithInviteBody,
    inviteToken: string,
    ip: string,
    userAgent: string
  ) {
    const email = normalizeEmail(body.email);
    return this._transaction.model.$transaction(async (tx) => {
      const consumed = await this._accessRepository.consumeInvite(
        tx,
        hashAccessToken(inviteToken),
        email
      );
      if (!consumed) {
        throw new HttpException(
          'This invite link is invalid or has expired',
          400
        );
      }

      return this._organizationService.createOrgAndUser(
        { ...body, email },
        ip,
        userAgent,
        tx
      );
    });
  }
}

export type AccessRequestRecord = AccessRequest;
export type AccessInviteRecord = AccessInvite;
