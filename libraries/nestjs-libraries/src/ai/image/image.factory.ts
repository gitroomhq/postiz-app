/**
 * Factory for image generation across different providers
 */

import pLimit from 'p-limit';

const limit = pLimit(10);

export type ImageProvider = 'openai' | 'fal' | 'stability' | 'replicate';

export interface ImageGenerationOptions {
  prompt: string;
  isVertical?: boolean;
  responseFormat?: 'url' | 'b64_json';
  model?: string;
}

export interface ImageConfig {
  provider: ImageProvider;
  model: string;
}

/**
 * Get the configured image provider from environment variables
 */
export function getImageProvider(): ImageProvider {
  const provider = process.env.IMAGE_PROVIDER?.toLowerCase() || 'openai';
  return provider as ImageProvider;
}

/**
 * Get the configured image model from environment variables
 */
export function getImageModel(): string {
  return process.env.IMAGE_MODEL || 'dall-e-3';
}

/**
 * Get the full image configuration
 */
export function getImageConfig(): ImageConfig {
  return {
    provider: getImageProvider(),
    model: getImageModel(),
  };
}

/**
 * Check if image generation is configured
 */
export function isImageConfigured(): boolean {
  const provider = getImageProvider();

  switch (provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'fal':
      return !!process.env.FAL_KEY;
    case 'stability':
      return !!process.env.STABILITY_API_KEY;
    case 'replicate':
      return !!process.env.REPLICATE_API_TOKEN;
    default:
      return false;
  }
}

/**
 * Generate an image using OpenAI DALL-E
 */
async function generateWithOpenAI(options: ImageGenerationOptions): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  });

  const model = options.model || getImageModel();
  const isUrl = options.responseFormat !== 'b64_json';

  const result = await openai.images.generate({
    prompt: options.prompt,
    response_format: isUrl ? 'url' : 'b64_json',
    model,
    ...(options.isVertical ? { size: '1024x1792' } : {}),
  });

  return isUrl ? result.data[0].url! : result.data[0].b64_json!;
}

/**
 * Generate an image using FAL.ai
 */
async function generateWithFal(options: ImageGenerationOptions): Promise<string> {
  const model = options.model || 'flux/schnell';

  const response = await limit(() =>
    fetch(`https://fal.run/fal-ai/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: options.prompt,
        aspect_ratio: options.isVertical ? '9:16' : '16:9',
        resolution: '720p',
        num_images: 1,
        output_format: 'jpeg',
        expand_prompt: true,
      }),
    })
  );

  const { images, video } = await response.json();

  if (video) {
    return video.url;
  }

  return images[0].url as string;
}

/**
 * Generate an image using Stability AI
 */
async function generateWithStability(options: ImageGenerationOptions): Promise<string> {
  const model = options.model || 'stable-diffusion-xl-1024-v1-0';
  const aspectRatio = options.isVertical ? '9:16' : '16:9';

  const response = await fetch(
    `https://api.stability.ai/v1/generation/${model}/text-to-image`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: options.prompt, weight: 1 }],
        cfg_scale: 7,
        height: options.isVertical ? 1536 : 1024,
        width: options.isVertical ? 1024 : 1536,
        steps: 30,
        samples: 1,
        aspect_ratio: aspectRatio,
      }),
    }
  );

  const result = await response.json();

  if (result.artifacts && result.artifacts.length > 0) {
    // Stability returns base64
    const base64 = result.artifacts[0].base64;
    // Convert to data URL
    return `data:image/png;base64,${base64}`;
  }

  throw new Error('No image generated from Stability AI');
}

/**
 * Generate an image using Replicate
 */
async function generateWithReplicate(options: ImageGenerationOptions): Promise<string> {
  const model = options.model || 'black-forest-labs/flux-schnell';
  const MAX_POLL_ATTEMPTS = 120; // 2 minutes max (120 * 1 second)
  const POLL_INTERVAL_MS = 1000;

  // Start the prediction
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model,
      input: {
        prompt: options.prompt,
        aspect_ratio: options.isVertical ? '9:16' : '16:9',
      },
    }),
  });

  let prediction = await response.json();

  // Poll for completion with timeout
  let attempts = 0;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    if (attempts >= MAX_POLL_ATTEMPTS) {
      throw new Error('Replicate prediction timed out after ' + MAX_POLL_ATTEMPTS + ' seconds');
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const pollResponse = await fetch(prediction.urls.get, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
    prediction = await pollResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error('Replicate prediction failed: ' + prediction.error);
  }

  // Return the first output URL
  const output = prediction.output;
  return Array.isArray(output) ? output[0] : output;
}

/**
 * Generate an image using the configured provider
 */
export async function generateImage(options: ImageGenerationOptions): Promise<string> {
  const provider = getImageProvider();

  switch (provider) {
    case 'openai':
      return generateWithOpenAI(options);
    case 'fal':
      return generateWithFal(options);
    case 'stability':
      return generateWithStability(options);
    case 'replicate':
      return generateWithReplicate(options);
    default:
      return generateWithOpenAI(options);
  }
}

/**
 * ImageFactory class for static access
 */
export class ImageFactory {
  /**
   * Generate an image using the configured provider
   */
  static async generateImage(options: ImageGenerationOptions): Promise<string> {
    return generateImage(options);
  }

  /**
   * Generate an image with just a prompt
   */
  static async generate(prompt: string, isVertical = false): Promise<string> {
    return generateImage({ prompt, isVertical });
  }

  /**
   * Get the current provider
   */
  static getProvider(): ImageProvider {
    return getImageProvider();
  }

  /**
   * Get the current model
   */
  static getModel(): string {
    return getImageModel();
  }

  /**
   * Check if image generation is configured
   */
  static isConfigured(): boolean {
    return isImageConfigured();
  }
}
