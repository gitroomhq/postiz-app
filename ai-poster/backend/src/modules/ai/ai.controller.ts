import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-text')
  @HttpCode(200)
  async generateText(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      prompt: string;
      templateId?: string;
      platform?: string;
      integrationId?: string;
    },
  ) {
    return this.aiService.generateText(user.organizationId, body);
  }

  @Post('generate-image')
  @HttpCode(200)
  async generateImage(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      prompt: string;
      style?: string;
      aspectRatio?: string;
    },
  ) {
    return this.aiService.generateImage(user.organizationId, body);
  }

  @Post('analyze-image')
  @HttpCode(200)
  async analyzeImage(
    @CurrentUser() user: AuthUser,
    @Body() body: { mediaId: string },
  ) {
    return this.aiService.analyzeImage(user.organizationId, body.mediaId);
  }

  @Post('extract-url')
  @HttpCode(200)
  async extractUrl(
    @CurrentUser() user: AuthUser,
    @Body() body: { url: string },
  ) {
    return this.aiService.extractUrl(body.url);
  }

  @Post('improve-text')
  @HttpCode(200)
  async improveText(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      text: string;
      instructions?: string;
      templateId?: string;
    },
  ) {
    return this.aiService.improveText(user.organizationId, body);
  }

  @Post('generate-hashtags')
  @HttpCode(200)
  async generateHashtags(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      text: string;
      platform?: string;
      count?: number;
    },
  ) {
    return this.aiService.generateHashtags(body);
  }
}
