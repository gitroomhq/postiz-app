import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, SubscriptionTier, User, VocaccioRole } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { ReligareService } from '@gitroom/nestjs-libraries/database/prisma/religare/religare.service';
import { VocaccioRoles } from '@gitroom/backend/services/auth/permissions/vocaccio-roles.decorator';
import {
  CreateReligareProfileDto,
  ListReligareProfilesDto,
  SetContextDto,
  SubmitQuestionnaireDto,
  UpdateReligareProfileDto,
} from '@gitroom/nestjs-libraries/dtos/religare/profile.dto';

/** O org de req carrega a assinatura (ver organization.repository.getOrgsByUserId). */
type OrgWithSubscription = Organization & {
  subscription?: { subscriptionTier: SubscriptionTier } | null;
};

const READ_ROLES = [
  VocaccioRole.OWNER,
  VocaccioRole.OPERATOR,
  VocaccioRole.EDITOR,
  VocaccioRole.VIEWER_INTERNAL,
] as const;

@ApiTags('Religare')
@Controller('/hub/religare')
export class ReligareController {
  constructor(private _religareService: ReligareService) {}

  @Get('/context')
  @VocaccioRoles(...READ_ROLES)
  getContext(@GetOrgFromRequest() org: Organization) {
    return this._religareService.getContext(org.id);
  }

  @Put('/context')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  setContext(@GetOrgFromRequest() org: Organization, @Body() body: SetContextDto) {
    return this._religareService.setContext(org.id, body.context);
  }

  @Get('/profiles')
  @VocaccioRoles(...READ_ROLES)
  listProfiles(
    @GetOrgFromRequest() org: Organization,
    @Query() query: ListReligareProfilesDto
  ) {
    return this._religareService.listProfiles(org.id, query.search, query.page);
  }

  @Get('/profiles/:id')
  @VocaccioRoles(...READ_ROLES)
  getProfile(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._religareService.getProfile(org.id, id);
  }

  @Get('/experts/:expertId/profile')
  @VocaccioRoles(...READ_ROLES)
  getProfileByExpert(
    @GetOrgFromRequest() org: Organization,
    @Param('expertId') expertId: string
  ) {
    return this._religareService.getProfileByExpert(org.id, expertId);
  }

  @Post('/profiles')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  createProfile(
    @GetOrgFromRequest() org: OrgWithSubscription,
    @Body() body: CreateReligareProfileDto,
    @GetUserFromRequest() user: User
  ) {
    return this._religareService.createProfile(
      org.id,
      body,
      org.subscription?.subscriptionTier,
      user.isSuperAdmin
    );
  }

  @Put('/profiles/:id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  updateProfile(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateReligareProfileDto
  ) {
    return this._religareService.updateProfile(org.id, id, body);
  }

  @Post('/profiles/:id/questionnaire')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR)
  submitQuestionnaire(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: SubmitQuestionnaireDto
  ) {
    return this._religareService.submitQuestionnaire(org.id, id, body);
  }

  @Post('/profiles/:id/recompute')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR)
  recompute(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._religareService.recompute(org.id, id);
  }

  @Delete('/profiles/:id')
  @VocaccioRoles(VocaccioRole.OWNER)
  deleteProfile(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._religareService.deleteProfile(org.id, id);
  }
}
