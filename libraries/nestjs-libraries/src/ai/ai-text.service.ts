import { Injectable, Logger } from '@nestjs/common';
import { generateObject, generateText } from 'ai';
import { shuffle } from 'lodash';
import { z } from 'zod';
import { AiClientFactory, TextClientResult } from './ai-client.factory';

const MAX_CAPTION_INPUT_CHARS = 8000;

const PostObjectSchema = z.object({ post: z.string() });
const TweetVariationsSchema = z.object({
  tweets: z.array(PostObjectSchema).length(5),
});
const ThreadVariationsSchema = z.object({
  threads: z
    .array(z.object({ posts: z.array(PostObjectSchema).min(2) }))
    .length(5),
});

const SeparatedPostsSchema = z.object({
  posts: z.array(z.string()),
});

const SinglePostSchema = z.object({ post: z.string() });

const PicturePromptSchema = z.object({ prompt: z.string() });

const SlidesSchema = z.object({
  slides: z.array(
    z.object({
      imagePrompt: z.string(),
      voiceText: z.string(),
    })
  ),
});

export type CaptionAction = 'generate' | 'improve';

export interface CaptionOptions {
  platform?: string;
  tone?: string;
}

@Injectable()
export class AiTextService {
  private readonly _logger = new Logger(AiTextService.name);

  constructor(private _factory: AiClientFactory) {}

  /**
   * Gera 5 variacoes de tweet + 5 threads, shuffled.
   * Mantem o formato Array<Array<{post: string}>> esperado pelos callers
   * legados de OpenaiService.generatePosts.
   */
  async generatePosts(
    organizationId: string,
    content: string,
    profileId?: string
  ): Promise<Array<Array<{ post: string }>>> {
    const client = await this._factory.text(organizationId, profileId);

    const [tweetsResult, threadsResult] = await Promise.all([
      this.callWithFallback(client, (model) =>
        generateObject({
          model,
          schema: TweetVariationsSchema,
          prompt: `Gere 5 variacoes diferentes de tweet (sem emojis) baseadas no conteudo abaixo.\n\nConteudo:\n${content}`,
          temperature: client.options.temperature ?? 1,
        })
      ),
      this.callWithFallback(client, (model) =>
        generateObject({
          model,
          schema: ThreadVariationsSchema,
          prompt: `Gere 5 variacoes de threads (sem emojis), cada thread com no minimo 2 posts.\n\nConteudo:\n${content}`,
          temperature: client.options.temperature ?? 1,
        })
      ),
    ]);

    const tweetGroups: Array<Array<{ post: string }>> =
      tweetsResult.object.tweets.map((t) => [{ post: t.post ?? '' }]);
    const threadGroups: Array<Array<{ post: string }>> =
      threadsResult.object.threads.map((thread) =>
        thread.posts.map((p) => ({ post: p.post ?? '' }))
      );

    return shuffle([...tweetGroups, ...threadGroups]);
  }

  async generatePromptForPicture(
    organizationId: string,
    prompt: string,
    profileId?: string
  ): Promise<string> {
    const client = await this._factory.text(organizationId, profileId);
    const result = await this.callWithFallback(client, (model) =>
      generateObject({
        model,
        schema: PicturePromptSchema,
        system:
          'Voce recebe uma descricao e estilo e gera um prompt detalhado para gerar imagens. Faca uma explicacao longa e descritiva, incluindo detalhes de estilo (camera, iluminacao, atmosfera, etc) quando aplicavel.',
        prompt: `prompt: ${prompt}`,
        temperature: client.options.temperature,
      })
    );
    return result.object.prompt;
  }

  async separatePosts(
    organizationId: string,
    content: string,
    len: number,
    profileId?: string
  ): Promise<{ posts: string[] }> {
    const client = await this._factory.text(organizationId, profileId);

    const result = await this.callWithFallback(client, (model) =>
      generateObject({
        model,
        schema: SeparatedPostsSchema,
        system: `Voce recebe um post de rede social e divide em uma thread. Cada post deve ter no minimo ${
          len - 10
        } e no maximo ${len} caracteres, mantendo a redacao exata e quebras de linha. Divida pelo contexto.`,
        prompt: content,
      })
    );

    const posts = await Promise.all(
      result.object.posts.map(async (post) => {
        if (post.length <= len) return post;
        let retries = 4;
        while (retries > 0) {
          try {
            const shrunk = await this.callWithFallback(client, (model) =>
              generateObject({
                model,
                schema: SinglePostSchema,
                system: `Voce recebe um post de rede social e encurta para no maximo ${len} caracteres, mantendo a redacao exata e quebras de linha.`,
                prompt: post,
              })
            );
            return shrunk.object.post;
          } catch (e) {
            retries--;
          }
        }
        return post;
      })
    );

    return { posts };
  }

  /**
   * Gera ou melhora a legenda de um post.
   * Trunca input em MAX_CAPTION_INPUT_CHARS pra evitar custo unbounded.
   */
  async caption(
    organizationId: string,
    action: CaptionAction,
    content: string,
    options: CaptionOptions = {},
    profileId?: string
  ): Promise<{ text: string }> {
    const truncated = (content ?? '').slice(0, MAX_CAPTION_INPUT_CHARS);
    const client = await this._factory.text(organizationId, profileId);

    const platformLine = options.platform
      ? `Plataforma alvo: ${options.platform}.`
      : '';
    const toneLine = options.tone ? `Tom: ${options.tone}.` : '';

    const system =
      action === 'generate'
        ? [
            'Voce e um assistente que gera legendas curtas e engajadoras para redes sociais.',
            'Sem emojis. Sem hashtags. Use no maximo 2-3 frases.',
            'Retorne apenas a legenda (sem cabecalho ou prefixo).',
            platformLine,
            toneLine,
          ]
            .filter(Boolean)
            .join(' ')
        : [
            'Voce e um assistente que melhora legendas de redes sociais sem mudar o significado.',
            'Mantenha o tom e a intencao da legenda original.',
            'Sem emojis. Sem hashtags adicionais. Use no maximo 2-3 frases.',
            'Retorne apenas a legenda melhorada.',
            platformLine,
            toneLine,
          ]
            .filter(Boolean)
            .join(' ');

    const userPrompt =
      action === 'generate'
        ? `Conteudo de referencia:\n${truncated}`
        : `Legenda original:\n${truncated}`;

    const result = await this.callWithFallback(client, (model) =>
      generateText({
        model,
        system,
        prompt: userPrompt,
        temperature: client.options.temperature ?? 0.7,
      })
    );

    return { text: result.text };
  }

  /**
   * Mantido para compatibilidade com ImageSlides.
   */
  async generateSlidesFromText(
    organizationId: string,
    text: string,
    profileId?: string
  ): Promise<Array<{ imagePrompt: string; voiceText: string }>> {
    const client = await this._factory.text(organizationId, profileId);
    for (let i = 0; i < 3; i++) {
      try {
        const result = await this.callWithFallback(client, (model) =>
          generateObject({
            model,
            schema: SlidesSchema,
            system:
              'Voce recebe um texto e divide em slides. Cada slide tem um image prompt e um voice text. O image prompt deve capturar a essencia do slide e ter um gradient escuro no topo. Sem texto na imagem. Gere 3-5 slides.',
            prompt: text,
          })
        );
        return result.object.slides.map((slide) => ({
          imagePrompt: slide.imagePrompt ?? '',
          voiceText: slide.voiceText ?? '',
        }));
      } catch (err) {
        this._logger.warn(
          `generateSlidesFromText tentativa ${i + 1} falhou: ${(err as Error).message}`
        );
      }
    }
    return [];
  }

  /**
   * Extrai conteudo de artigo de um texto bruto de pagina e gera variacoes.
   */
  async extractWebsiteText(
    organizationId: string,
    content: string,
    profileId?: string
  ): Promise<Array<Array<{ post: string }>>> {
    const client = await this._factory.text(organizationId, profileId);

    const articleResult = await this.callWithFallback(client, (model) =>
      generateText({
        model,
        system:
          'Voce recebe o texto integral de uma pagina e extrai apenas o conteudo do artigo (corpo principal), descartando menus, footers, metadata.',
        prompt: content,
      })
    );

    return this.generatePosts(
      organizationId,
      articleResult.text,
      profileId
    );
  }

  /**
   * Roda a chamada com fallback automatico para fallbackModel quando o
   * primeiro modelo lanca erro (network, rate limit, invalid response).
   * O invoke recebe o `model` como argumento — assim conseguimos reexecutar
   * com o fallback sem reaproveitar a closure do modelo principal.
   */
  private async callWithFallback<R>(
    client: TextClientResult,
    invoke: (model?: any) => Promise<R>
  ): Promise<R> {
    try {
      return await invoke(client.model);
    } catch (primaryError) {
      if (!client.fallbackModel) throw primaryError;
      this._logger.warn(
        `Modelo principal falhou, tentando fallback. Erro: ${(primaryError as Error).message}`
      );
      try {
        return await invoke(client.fallbackModel);
      } catch (fallbackError) {
        this._logger.error(
          `Fallback tambem falhou: ${(fallbackError as Error).message}`
        );
        throw primaryError;
      }
    }
  }
}
