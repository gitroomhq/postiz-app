import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { Response } from 'express';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permissions.service';
import {removeSubdomain} from "@gitroom/helpers/subdomain/subdomain.management";

@Controller('/user')
export class UsersController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _stripeService: StripeService,
    private _authService: AuthService,
    private _orgService: OrganizationService
  ) {}
  @Get('/self')
  async getSelf(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization
  ) {
    if (!organization) {
      throw new HttpException('Organization not found', 401);
    }

    return {
      ...user,
      orgId: organization.id,
      // @ts-ignore
      tier: organization?.subscription?.subscriptionTier || 'FREE',
      // @ts-ignore
      role: organization?.users[0]?.role,
    };
  }

  @Get('/subscription')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async getSubscription(@GetOrgFromRequest() organization: Organization) {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organization.id
      );

    return subscription ? { subscription } : { subscription: undefined };
  }

  @Get('/subscription/tiers')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async tiers() {
    return this._stripeService.getPackages();
  }

  @Post('/join-org')
  async joinOrg(
    @GetUserFromRequest() user: User,
    @Body('org') org: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const getOrgFromCookie = this._authService.getOrgFromCookie(org);

    if (!getOrgFromCookie) {
      return response.status(200).json({ id: null });
    }

    const addedOrg = await this._orgService.addUserToOrg(
      user.id,
      getOrgFromCookie.id,
      getOrgFromCookie.orgId,
      getOrgFromCookie.role
    );

    response.status(200).json({
      id: typeof addedOrg !== 'boolean' ? addedOrg.organizationId : null,
    });
  }

  @Get('/organizations')
  async getOrgs(@GetUserFromRequest() user: User) {
    return this._orgService.getOrgsByUserId(user.id);
  }

  @Post('/change-org')
  changeOrg(
    @Body('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    response.cookie('showorg', id, {
      domain: '.' + new URL(removeSubdomain(process.env.FRONTEND_URL!)).hostname,
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    response.status(200).send();
  }
}
