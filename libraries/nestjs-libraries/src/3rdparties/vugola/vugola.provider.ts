import {
  ThirdParty,
  ThirdPartyAbstract,
} from '@gitroom/nestjs-libraries/3rdparties/thirdparty.interface';
import { timer } from '@gitroom/helpers/utils/timer';

const VUGOLA_API_BASE = 'https://api.vugolaai.com';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ITERATIONS = 720; // 5s * 720 = 1h ceiling

@ThirdParty({
  identifier: 'vugola',
  title: 'Vugola',
  description:
    'AI video clipping — turn long videos (podcasts, YouTube, interviews) into short-form clips with captions.',
  position: 'media',
  fields: [],
})
export class VugolaProvider extends ThirdPartyAbstract<{
  video_url: string;
  aspect_ratio: string;
  caption_style: string;
}> {
  async checkConnection(
    apiKey: string
  ): Promise<false | { name: string; username: string; id: string }> {
    const response = await fetch(`${VUGOLA_API_BASE}/status`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as { plan?: string };
    const planLabel = typeof body?.plan === 'string' ? body.plan : 'account';

    return {
      name: `Vugola (${planLabel})`,
      username: 'vugola',
      id: apiKey.slice(-8),
    };
  }

  async sendData(
    apiKey: string,
    data: {
      video_url: string;
      aspect_ratio: string;
      caption_style: string;
    }
  ): Promise<string> {
    const startResponse = await fetch(`${VUGOLA_API_BASE}/clip`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        video_url: data.video_url,
        aspect_ratio: data.aspect_ratio,
        caption_style: data.caption_style,
      }),
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text().catch(() => '');
      throw new Error(
        `Vugola failed to start clipping job (${startResponse.status})${
          errorText ? `: ${errorText.slice(0, 200)}` : ''
        }`
      );
    }

    const { job_id: jobId } = (await startResponse.json()) as {
      job_id: string;
    };

    if (!jobId) {
      throw new Error('Vugola did not return a job_id');
    }

    for (let i = 0; i < MAX_POLL_ITERATIONS; i++) {
      await timer(POLL_INTERVAL_MS);

      const statusResponse = await fetch(
        `${VUGOLA_API_BASE}/clip/${encodeURIComponent(jobId)}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(
          `Vugola status check failed (${statusResponse.status})`
        );
      }

      const statusBody = (await statusResponse.json()) as {
        status: string;
        clips?: Array<{
          download_url: string;
          virality_score?: number;
        }>;
        error?: string;
      };

      if (statusBody.status === 'failed') {
        throw new Error(
          `Vugola clipping failed: ${statusBody.error ?? 'unknown error'}`
        );
      }

      if (statusBody.status === 'complete') {
        const clips = statusBody.clips ?? [];
        if (clips.length === 0) {
          throw new Error('Vugola returned no clips');
        }

        const best = [...clips].sort(
          (a, b) => (b.virality_score ?? 0) - (a.virality_score ?? 0)
        )[0];

        if (!best?.download_url) {
          throw new Error('Vugola clip is missing a download URL');
        }

        // Vugola download URLs require the same Bearer header. Postiz's
        // storage fetches publicly, so we download the clip bytes here with
        // auth and return a data: URL so downstream storage can read it.
        const clipResponse = await fetch(best.download_url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (!clipResponse.ok) {
          throw new Error(
            `Vugola clip download failed (${clipResponse.status})`
          );
        }

        const buffer = Buffer.from(await clipResponse.arrayBuffer());
        return `data:video/mp4;base64,${buffer.toString('base64')}`;
      }
    }

    throw new Error(
      'Vugola clipping timed out. Check your Vugola dashboard and email for the completed clips.'
    );
  }
}
