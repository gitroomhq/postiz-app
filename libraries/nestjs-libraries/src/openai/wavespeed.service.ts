import { Injectable } from '@nestjs/common';

import pLimit from 'p-limit';
const limit = pLimit(10);

const BASE_URL = 'https://api.wavespeed.ai/api/v3';
const DEFAULT_MODEL = 'bytedance/seedream-v5.0-pro';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 600_000;

interface WavespeedEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

interface WavespeedPrediction {
  id: string;
  status: string;
  outputs?: string[];
  error?: string;
}

@Injectable()
export class WavespeedService {
  static get enabled() {
    return !!process.env.WAVESPEED_API_KEY;
  }

  async generateImage(prompt: string): Promise<string> {
    const model = process.env.WAVESPEED_IMAGE_MODEL || DEFAULT_MODEL;

    const submitted = await this.request<WavespeedPrediction>(`/${model}`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });

    const prediction = await this.waitForPrediction(submitted.id);
    const url = prediction.outputs?.[0];
    if (!url) {
      throw new Error('WaveSpeed prediction completed without outputs');
    }

    // The image endpoints return a base64 payload (see OpenaiService), so
    // download the generated image and hand back its base64 encoding.
    const image = await limit(() => fetch(url));
    if (!image.ok) {
      throw new Error(`Failed to download generated image: ${image.status}`);
    }

    return Buffer.from(await image.arrayBuffer()).toString('base64');
  }

  private async waitForPrediction(id: string): Promise<WavespeedPrediction> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    for (;;) {
      const prediction = await this.request<WavespeedPrediction>(
        `/predictions/${id}/result`,
        { method: 'GET' }
      );

      if (prediction.status === 'completed') {
        return prediction;
      }

      if (['failed', 'cancelled', 'timeout'].includes(prediction.status)) {
        throw new Error(
          `WaveSpeed prediction ${prediction.status}${
            prediction.error ? `: ${prediction.error}` : ''
          }`
        );
      }

      if (Date.now() > deadline) {
        throw new Error(`WaveSpeed prediction timed out (task id: ${id})`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await limit(() =>
      fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${process.env.WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json',
        },
      })
    );

    const json = (await response
      .json()
      .catch(() => ({}))) as WavespeedEnvelope<T>;

    if (!response.ok || json.code !== 200) {
      throw new Error(
        json.message ||
          `WaveSpeed API request failed: ${response.status} ${response.statusText}`
      );
    }

    return json.data;
  }
}
