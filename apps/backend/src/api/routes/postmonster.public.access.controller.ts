import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ThrottlerRealIpGuard } from '@gitroom/nestjs-libraries/throttler/throttler.provider';
import { ApiTags } from '@nestjs/swagger';
import { RealIP } from 'nestjs-real-ip';
import { UserAgent } from '@gitroom/nestjs-libraries/user/user.agent';
import { CreateAccessRequestDto } from '@gitroom/nestjs-libraries/dtos/access/create.access.request.dto';
import {
  AccessService,
  hashIp,
} from '@gitroom/nestjs-libraries/database/prisma/postmonster-access/access.service';

@ApiTags('Access')
@Controller('/public')
export class PublicAccessController {
  constructor(private _accessService: AccessService) {}

  // Public landing endpoint (PRD 6): no auth, CORS is limited to the landing
  // origins via LANDING_ORIGINS in main.ts, 5 requests/hour per client IP.
  // The response is identical for a fresh request, a duplicate and an email
  // that already has an account, so it never reveals anything about the email
  @UseGuards(ThrottlerRealIpGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post('/access-requests')
  async createAccessRequest(
    @Body() body: CreateAccessRequestDto,
    @RealIP() ip: string,
    @UserAgent() userAgent: string
  ) {
    // honeypot: bots fill every field, humans never see this one
    if (body.website) {
      return { ok: true };
    }

    await this._accessService.submitRequest(body, {
      ipHash: hashIp(ip),
      userAgent: userAgent || null,
    });

    return { ok: true };
  }

  // Lets the register form prefill the readonly email of an invite
  @UseGuards(ThrottlerRealIpGuard)
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  @Get('/access-invites/:token')
  async getInvite(@Param('token') token: string) {
    if (!token || token.length < 20 || token.length > 128) {
      throw new HttpException('This invite link is invalid or has expired', 400);
    }
    return this._accessService.getInviteByToken(token);
  }
}
