import {
  Body,
  Controller,
  HttpException,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Organization, Profile } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetProfileFromRequest } from '@gitroom/nestjs-libraries/user/profile.from.request';
import { AiWebSearchService } from '@gitroom/nestjs-libraries/ai/ai-web-search.service';
import { AiTextService } from '@gitroom/nestjs-libraries/ai/ai-text.service';
import { loadPersonaBlock } from '@gitroom/nestjs-libraries/ai/persona.helper';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';
import {
  GeneratePostFromWebDto,
  WebExtractDto,
  WebSearchDto,
} from '@gitroom/nestjs-libraries/dtos/ai/web-search.dto';

const MAX_CAPTION_CONTENT_CHARS = 8000;

@ApiTags('AI Web Search')
@Controller('/ai/web-search')
export class AiWebSearchController {
  private readonly _logger = new Logger(AiWebSearchController.name);

  constructor(
    private _aiWebSearchService: AiWebSearchService,
    private _aiTextService: AiTextService,
    private _profileService: ProfileService
  ) {}

  /**
   * Endpoint puro de search — usado pelo `webSearchTool` do agente.
   * Composer NAO chama este, chama `/generate-post` que orquestra tudo.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('/search')
  async search(
    @GetOrgFromRequest() org: Organization,
    @GetProfileFromRequest() profile: Profile | null,
    @Body() body: WebSearchDto
  ) {
    return this._aiWebSearchService.search(
      org.id,
      body.query,
      profile?.id,
      {
        maxResults: body.maxResults,
        topic: body.topic,
        days: body.days,
        includeAnswer: body.includeAnswer,
        searchDepth: body.searchDepth,
      }
    );
  }

  /**
   * Endpoint puro de extract — usado pelo `extractUrlsTool` do agente.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('/extract')
  async extract(
    @GetOrgFromRequest() org: Organization,
    @GetProfileFromRequest() profile: Profile | null,
    @Body() body: WebExtractDto
  ) {
    return this._aiWebSearchService.extract(
      org.id,
      body.urls,
      profile?.id,
      {
        extractDepth: body.extractDepth,
        format: body.format,
        query: body.query,
      }
    );
  }

  /**
   * Endpoint orquestrado para o composer.
   * Pipeline:
   *   - mode='search'  → search (com includeAnswer) → caption(generate)
   *   - mode='extract' → extract → caption(generate, sourceWrapped)
   *
   * Retorna `{ text, sources, partial? }` pronto para `editor.commands.setContent`.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('/generate-post')
  async generatePost(
    @GetOrgFromRequest() org: Organization,
    @GetProfileFromRequest() profile: Profile | null,
    @Body() body: GeneratePostFromWebDto
  ): Promise<{
    text: string;
    sources: Array<{ url: string; title?: string }>;
    partial?: boolean;
  }> {
    const personaBlock = await loadPersonaBlock(
      this._profileService,
      profile?.id
    );
    try {
      if (body.mode === 'search') {
        if (!body.query) {
          throw new HttpException('query obrigatoria em mode=search', 400);
        }
        return await this.runSearchPipeline(
          org.id,
          profile?.id,
          body.query,
          body.days,
          body.topic,
          body.platform,
          body.tone,
          personaBlock
        );
      }

      if (!body.urls || body.urls.length === 0) {
        throw new HttpException('urls obrigatorias em mode=extract', 400);
      }
      return await this.runExtractPipeline(
        org.id,
        profile?.id,
        body.urls,
        body.extractDepth,
        body.platform,
        body.tone,
        personaBlock
      );
    } catch (e) {
      // Mensagem clara quando o que falha e a credencial de TEXT (precisa
      // do caption pra escrever o post final, mesmo se WEB_SEARCH esta OK).
      if (
        e instanceof HttpException &&
        e.getStatus() === 412 &&
        this.isTextCredentialError(e)
      ) {
        throw new HttpException(
          'Configure também a chave de Texto em Settings > AI Provider > Geração de texto. ' +
            'Ela é necessária para escrever a legenda final a partir dos resultados da busca.',
          412
        );
      }
      throw e;
    }
  }

  /**
   * Heuristica: o resolver lanca 412 com mensagem padrao quando nao ha
   * credencial. Aqui na chamada, o WEB_SEARCH ja foi resolvido com
   * sucesso (caso contrario teria falhado antes do caption). Se cai
   * 412 a esta altura do pipeline, a credencial faltante e a de TEXT.
   *
   * O regex precisa cobrir as duas mensagens possiveis do resolver
   * (NOT_CONFIGURED_MESSAGE e NOT_SHARED_MESSAGE) — ambas em pt-BR
   * com acentos. Manter sem acento na regex (case-insensitive) para
   * tolerar pequenas variacoes de caps.
   */
  private isTextCredentialError(e: HttpException): boolean {
    const response = e.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as { message?: string })?.message ?? '';
    return /Configure suas chaves|n[aã]o tem chave pr[oó]pria/i.test(message);
  }

  // ---------------- pipelines ----------------

  private async runSearchPipeline(
    orgId: string,
    profileId: string | undefined,
    query: string,
    days: number | undefined,
    topic: 'general' | 'news' | 'finance' | undefined,
    platform: string | undefined,
    tone: string | undefined,
    personaBlock: string
  ) {
    const search = await this._aiWebSearchService.search(orgId, query, profileId, {
      maxResults: 5,
      includeAnswer: true,
      ...(topic ? { topic } : {}),
      ...(days ? { days } : {}),
    });

    const sources = (search.results ?? []).map((r: any) => ({
      url: r.url ?? '',
      title: r.title ?? '',
    }));

    const blocks: string[] = [];
    blocks.push(`Tema: ${query}`);
    if ((search as any).answer) {
      blocks.push(`Resposta direta:\n${(search as any).answer}`);
    }
    const sourceTags = (search.results ?? [])
      .slice(0, 5)
      .map(
        (r: any) =>
          `<source url="${r.url}">\n${r.title}\n${r.content ?? ''}\n</source>`
      )
      .join('\n\n');
    if (sourceTags) blocks.push(`Fontes:\n${sourceTags}`);

    const content = blocks.join('\n\n').slice(0, MAX_CAPTION_CONTENT_CHARS);

    const { text } = await this._aiTextService.caption(
      orgId,
      'generate',
      content,
      { platform, tone, sourceWrapped: !!sourceTags, personaBlock },
      profileId
    );

    return { text, sources };
  }

  private async runExtractPipeline(
    orgId: string,
    profileId: string | undefined,
    urls: string[],
    extractDepth: 'basic' | 'advanced' | undefined,
    platform: string | undefined,
    tone: string | undefined,
    personaBlock: string
  ) {
    const extract = await this._aiWebSearchService.extract(
      orgId,
      urls,
      profileId,
      {
        extractDepth: extractDepth ?? 'basic',
        format: 'markdown',
      }
    );

    const successCount = extract.results?.length ?? 0;
    const failedCount = extract.failedResults?.length ?? 0;

    if (successCount === 0) {
      throw new HttpException(
        'Nao foi possivel extrair nenhuma URL. Verifique se sao acessiveis.',
        502
      );
    }

    const sourceTags = (extract.results ?? [])
      .map(
        (r: any) =>
          `<source url="${r.url}">\n${r.rawContent ?? r.raw_content ?? ''}\n</source>`
      )
      .join('\n\n');
    const content = sourceTags.slice(0, MAX_CAPTION_CONTENT_CHARS);

    const { text } = await this._aiTextService.caption(
      orgId,
      'generate',
      content,
      { platform, tone, sourceWrapped: true, personaBlock },
      profileId
    );

    const sources = (extract.results ?? []).map((r: any) => ({
      url: r.url ?? '',
    }));

    return {
      text,
      sources,
      ...(failedCount > 0 ? { partial: true } : {}),
    };
  }
}
