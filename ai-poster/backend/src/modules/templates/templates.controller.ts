import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.templatesService.list(user.organizationId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      description?: string;
      category?: string;
      brandContext?: string;
      targetAudience?: string;
      tone?: string;
      language?: string;
      goals?: string[];
      dos?: string[];
      donts?: string[];
      inspirationTexts?: string[];
      referenceUrls?: string[];
      examplePosts?: string[];
      defaultHashtags?: string[];
      hashtagStrategy?: string;
      ctaTemplate?: string;
      postStructure?: string;
      emojiUsage?: string;
      contentLength?: string;
      imageStyle?: string;
      preferUserImages?: boolean;
      imageOverlayText?: boolean;
    },
  ) {
    return this.templatesService.create(user, body);
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.detail(user.organizationId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      category?: string;
      brandContext?: string;
      targetAudience?: string;
      tone?: string;
      language?: string;
      goals?: string[];
      dos?: string[];
      donts?: string[];
      inspirationTexts?: string[];
      referenceUrls?: string[];
      examplePosts?: string[];
      defaultHashtags?: string[];
      hashtagStrategy?: string;
      ctaTemplate?: string;
      postStructure?: string;
      emojiUsage?: string;
      contentLength?: string;
      imageStyle?: string;
      preferUserImages?: boolean;
      imageOverlayText?: boolean;
    },
  ) {
    return this.templatesService.update(user.organizationId, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.remove(user.organizationId, id);
  }

  @Post(':id/duplicate')
  async duplicate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.duplicate(user, id);
  }

  @Put(':id/overrides/:platform')
  async setPlatformOverride(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('platform') platform: string,
    @Body()
    body: {
      toneOverride?: string;
      hashtagOverride?: string[];
      contentLengthOverride?: string;
      additionalInstructions?: string;
      postTypePreference?: string;
      customCta?: string;
    },
  ) {
    return this.templatesService.setPlatformOverride(
      user.organizationId,
      id,
      platform,
      body,
    );
  }

  @Post(':id/inspiration-images')
  async addInspirationImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { mediaId: string; description?: string },
  ) {
    return this.templatesService.addInspirationImage(
      user.organizationId,
      id,
      body.mediaId,
      body.description,
    );
  }

  @Delete(':id/inspiration-images/:imageId')
  async removeInspirationImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.templatesService.removeInspirationImage(
      user.organizationId,
      id,
      imageId,
    );
  }
}
