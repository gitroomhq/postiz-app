import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Organization, Profile } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetProfileFromRequest } from '@gitroom/nestjs-libraries/user/profile.from.request';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { GenerateVideoBodyDto } from '@gitroom/nestjs-libraries/dtos/ai/video.dto';

@ApiTags('AI Video')
@Controller('/ai/video')
export class AiVideoController {
  private readonly _logger = new Logger(AiVideoController.name);

  constructor(private _mediaService: MediaService) {}

  /**
   * Geracao de video via Kie.ai (Seedance 2.0 / Seedance 2 Fast / Veo 3.x).
   * Delega tudo (credito + AiVideoService + uploadSimple + saveFile) para
   * MediaService.generateAiVideo, que e reusado tambem pelo MCP tool do
   * agente.
   *
   * Rate limit: 10/min — video e caro em tempo (10min de polling) e custo,
   * queremos limite mais agressivo que texto/imagem.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('/generate')
  async generate(
    @GetOrgFromRequest() org: Organization,
    @GetProfileFromRequest() profile: Profile | null,
    @Body() body: GenerateVideoBodyDto
  ) {
    return this._mediaService.generateAiVideo(
      org,
      {
        prompt: body.prompt,
        mode: body.mode,
        referenceImageUrl: body.referenceImageUrl,
        aspectRatio: body.aspectRatio,
        enrichPrompt: body.enrichPrompt,
      },
      profile?.id
    );
  }
}
