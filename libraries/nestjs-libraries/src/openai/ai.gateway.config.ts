import OpenAI from 'openai';

/**
 * Cloudflare AI Gateway routing (dynamic routes).
 *
 * When CF_AIG_TOKEN and CF_ACCOUNT_ID are set, every OpenAI-compatible text
 * call is routed through the AI Gateway universal OpenAI-compat endpoint and
 * model ids are replaced with *dynamic route* slugs (default
 * `dynamic/text_gen`), so model selection, fallbacks, caching, BYOK keys and
 * observability live in the gateway — not in this codebase.
 *
 * The compat endpoint does NOT support `images/generations` (gateway error
 * 2019), so image generation goes to AI_IMAGE_BASE_URL instead: the fronting
 * Cloudflare Worker exposes an OpenAI-images-shaped endpoint backed by
 * `env.AI.run(model, input, { gateway: { id } })` — the sanctioned
 * Worker-side gateway pattern (see deploy/cloudflare/worker/src/index.ts).
 *
 * When CF_AIG_TOKEN is not set everything falls back to stock OpenAI
 * behaviour, leaving upstream Postiz installs unaffected.
 */

const accountId =
  process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
const gatewayId = process.env.CF_GATEWAY_ID || 'x';
const gatewayToken = process.env.CF_AIG_TOKEN || '';

export const aiGatewayEnabled = !!(accountId && gatewayToken);

/** Base URL for chat/completions-compatible calls (OpenAI SDK appends paths). */
export const aiBaseURL = aiGatewayEnabled
  ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat`
  : undefined;

/**
 * The gateway accepts the AI Gateway token as a plain `Authorization: Bearer`
 * key (verified against this account), so it can be used as `apiKey` by any
 * OpenAI-compatible SDK. cf-aig-zdr enforces zero-data-retention routing.
 */
export const aiApiKey = aiGatewayEnabled
  ? gatewayToken
  : process.env.OPENAI_API_KEY || 'sk-proj-';

export const aiDefaultHeaders: Record<string, string> | undefined =
  aiGatewayEnabled
    ? {
        'cf-aig-authorization': `Bearer ${gatewayToken}`,
        'cf-aig-zdr': 'true',
      }
    : undefined;

/** Dynamic route for text generation; fallback keeps upstream model choice. */
export const textModel = (fallback = 'gpt-4.1') =>
  aiGatewayEnabled ? process.env.AI_TEXT_MODEL || 'dynamic/text_gen' : fallback;

export const imageModel = (fallback = 'chatgpt-image-latest') =>
  aiGatewayEnabled
    ? process.env.AI_IMAGE_MODEL || 'dynamic/image_gen'
    : fallback;

/**
 * Where OpenAI-images-shaped requests go. With the gateway enabled this must
 * point at the fronting Worker (e.g. `https://<app>/__ai/v1`); without it,
 * undefined keeps the OpenAI SDK default.
 */
export const aiImagesBaseURL = aiGatewayEnabled
  ? process.env.AI_IMAGE_BASE_URL || undefined
  : undefined;

let imagesClient: OpenAI | undefined;
const getImagesClient = () => {
  if (!imagesClient) {
    imagesClient = new OpenAI({
      apiKey: aiApiKey,
      baseURL: aiImagesBaseURL,
      defaultHeaders: aiDefaultHeaders,
    });
  }
  return imagesClient;
};

/**
 * Drop-in replacement for `new DallEAPIWrapper(...).invoke(prompt)`.
 * Returns either a `data:` URL (b64 responses) or a remote URL — both are
 * accepted by `IUploadProvider.uploadSimple`.
 */
export async function generateAiImage(
  prompt: string,
  opts: { isVertical?: boolean } = {}
): Promise<string | null> {
  const generate = await getImagesClient().images.generate({
    prompt,
    model: imageModel(),
    size: opts.isVertical ? '1024x1536' : '1024x1024',
  });

  const image = generate.data?.[0];
  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }
  return image?.url || null;
}
