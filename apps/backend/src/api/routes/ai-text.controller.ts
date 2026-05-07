import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Organization, Profile } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetProfileFromRequest } from '@gitroom/nestjs-libraries/user/profile.from.request';
import { AiTextService } from '@gitroom/nestjs-libraries/ai/ai-text.service';
import { CaptionDto } from '@gitroom/nestjs-libraries/dtos/ai/caption.dto';
import { loadPersonaBlock } from '@gitroom/nestjs-libraries/ai/persona.helper';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';

@ApiTags('AI Text')
@Controller('/ai/text')
export class AiTextController {
  constructor(
    private _aiTextService: AiTextService,
    private _profileService: ProfileService
  ) {}

  /**
   * Geração ou melhoria de legenda usada pelos botões "Gerar legenda com IA"
   * e "Melhorar com IA" no composer.
   *
   * Rate limit: 30 requisições por minuto por usuário (sobrescreve o default
   * global do ThrottlerModule de 30/h). Sem isso o botão vira torneira de
   * custo se o usuário ficar martelando.
   *
   * O service trunca o input em 8000 caracteres antes de enviar ao LLM.
   * A persona do perfil (se existir) é carregada aqui e injetada no
   * system prompt para o LLM respeitar tom de voz, restrições e CTAs.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('/caption')
  async caption(
    @GetOrgFromRequest() org: Organization,
    @GetProfileFromRequest() profile: Profile | null,
    @Body() body: CaptionDto
  ) {
    const personaBlock = await loadPersonaBlock(
      this._profileService,
      profile?.id
    );
    return this._aiTextService.caption(
      org.id,
      body.action,
      body.content,
      {
        platform: body.platform,
        tone: body.tone,
        personaBlock,
      },
      profile?.id
    );
  }
}
