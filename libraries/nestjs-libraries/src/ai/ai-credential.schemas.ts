import { AiKind } from '@prisma/client';
import { z } from 'zod';

export const TextOptionsSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
    verbosity: z.enum(['low', 'medium', 'high']).optional(),
    providerOrder: z.array(z.string()).optional(),
    allowFallbacks: z.boolean().optional(),
    maxPricePromptUSD: z.number().nonnegative().optional(),
    maxPriceCompletionUSD: z.number().nonnegative().optional(),
  })
  .strict();

export type TextOptions = z.infer<typeof TextOptionsSchema>;

export const ImageOptionsSchema = z
  .object({
    quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
    imageSize: z.enum(['0.5K', '1K', '2K', '4K']).optional(),
    numImages: z.number().int().min(1).max(4).optional(),
  })
  .strict();

export type ImageOptions = z.infer<typeof ImageOptionsSchema>;

export const VideoOptionsSchema = z
  .object({
    /** Resolucao do video. Aplicavel apenas a Seedance (Veo escolhe automatico). */
    resolution: z.enum(['480p', '720p', '1080p']).optional(),
    /** Duracao em segundos (4-15). Aplicavel apenas a Seedance. Veo gera ~8s fixo. */
    durationSeconds: z.number().int().min(4).max(15).optional(),
    /** Gerar audio junto com o video. Aplicavel apenas a Seedance 2 (full). */
    audio: z.boolean().optional(),
  })
  .strict();

export type VideoOptions = z.infer<typeof VideoOptionsSchema>;

export const WebSearchOptionsSchema = z
  .object({
    maxResults: z.number().int().min(1).max(20).optional(),
    depth: z.enum(['basic', 'advanced']).optional(),
    includeRawContent: z.boolean().optional(),
  })
  .strict();

export type WebSearchOptions = z.infer<typeof WebSearchOptionsSchema>;

export type AiOptions =
  | TextOptions
  | ImageOptions
  | VideoOptions
  | WebSearchOptions;

export const optionsSchemaFor = (kind: AiKind) => {
  switch (kind) {
    case 'TEXT':
      return TextOptionsSchema;
    case 'IMAGE':
      return ImageOptionsSchema;
    case 'VIDEO':
      return VideoOptionsSchema;
    case 'WEB_SEARCH':
      return WebSearchOptionsSchema;
  }
};

export const SaveAiCredentialPayloadSchema = z
  .object({
    provider: z.string().min(1),
    model: z.string().min(1).optional(),
    fallbackModel: z.string().min(1).optional(),
    apiKey: z.string().min(1),
    options: z.unknown().optional(),
    shareDefault: z.boolean().optional(),
  })
  .strict();

export type SaveAiCredentialPayload = z.infer<
  typeof SaveAiCredentialPayloadSchema
>;
