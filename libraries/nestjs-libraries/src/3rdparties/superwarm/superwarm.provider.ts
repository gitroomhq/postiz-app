import {
  ThirdParty,
  ThirdPartyAbstract,
} from '@gitroom/nestjs-libraries/3rdparties/thirdparty.interface';

const SUPERWARM_API = 'https://superwarm.co/api/public';

interface SuperWarmAccount {
  id: string;
  handle: string;
  platform: string;
  niche: string;
  status: string;
  persona: {
    displayName: string | null;
    profilePicUrl: string | null;
  } | null;
}

@ThirdParty({
  identifier: 'superwarm',
  title: 'SuperWarm',
  description:
    'Distribute content to your TikTok & Instagram warming accounts. SuperWarm builds social proof at scale before you launch.',
  position: 'media',
  fields: [],
})
export class SuperWarmProvider extends ThirdPartyAbstract<object> {
  async checkConnection(apiKey: string) {
    const res = await fetch(`${SUPERWARM_API}/verify`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { id: string; name: string; username: string };
    return {
      id: data.id,
      name: data.name,
      username: data.username,
    };
  }

  async accounts(apiKey: string): Promise<SuperWarmAccount[]> {
    const res = await fetch(`${SUPERWARM_API}/accounts`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { accounts: SuperWarmAccount[] };
    return data.accounts;
  }

  async sendData(
    apiKey: string,
    data: { jobId: string; content: string; mediaUrls?: string[]; scheduledAt?: string }
  ): Promise<string> {
    const res = await fetch(`${SUPERWARM_API}/submit-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jobId: data.jobId,
        content: data.content,
        mediaUrls: data.mediaUrls ?? [],
        scheduledAt: data.scheduledAt,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? 'SuperWarm post submission failed');
    }

    const result = (await res.json()) as { postId: string };
    return result.postId;
  }
}
