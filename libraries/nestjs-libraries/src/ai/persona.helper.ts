import { Logger } from '@nestjs/common';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';
import { renderPersonaPrompt } from '@gitroom/nestjs-libraries/chat/helpers/persona.prompt';

const logger = new Logger('PersonaHelper');

/**
 * Carrega a persona do perfil e renderiza como bloco de instrucoes
 * pronto para injetar no system prompt. Retorna string vazia quando
 * nao ha profileId, persona nao existe, ou qualquer erro de DB
 * (best-effort — persona nao deve quebrar o fluxo principal).
 *
 * Centralizado aqui para evitar que cada controller que chama
 * AiTextService.caption duplique a logica. Tambem evita injetar
 * ProfileService no AiTextService (criaria ciclo entre AiModule e
 * DatabaseModule).
 */
export async function loadPersonaBlock(
  profileService: ProfileService,
  profileId?: string
): Promise<string> {
  if (!profileId) return '';
  try {
    const persona = await profileService.getPersonaForAgent(profileId);
    if (!persona) return '';
    return renderPersonaPrompt(persona) ?? '';
  } catch (e: any) {
    logger.warn(`persona error: profileId=${profileId} ${e?.message ?? e}`);
    return '';
  }
}
