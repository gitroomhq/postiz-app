import { Injectable } from '@nestjs/common';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { Provider } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'studio-tools-plan:';

export interface PlanDetails {
  socialChannels: number;
  postizTier: string;
  planName: string;
}

@Injectable()
export class PlanSyncService {
  constructor(private _prisma: PrismaService) {}

  /**
   * Get effective channel limit for an org. Uses Studio Tools for Firebase users, fallback for legacy.
   */
  async getEffectiveChannelLimit(
    orgId: string,
    fallbackTotalChannels: number
  ): Promise<number> {
    const planDetails = await this.getPlanDetailsForOrg(orgId);
    return planDetails?.socialChannels ?? fallbackTotalChannels;
  }

  /**
   * Get plan details for an organization. For Firebase SSO users, fetches from Studio Tools API.
   * For legacy users, returns null (caller should use Postiz subscription).
   */
  async getPlanDetailsForOrg(orgId: string): Promise<PlanDetails | null> {
    const firebaseUid = await this.getFirebaseUidForOrg(orgId);
    if (!firebaseUid) {
      return null;
    }
    return this.getPlanDetails(firebaseUid);
  }

  /**
   * Get Firebase UID for the first Firebase-authenticated user in the org.
   */
  private async getFirebaseUidForOrg(orgId: string): Promise<string | null> {
    const org = await this._prisma.organization.findFirst({
      where: { id: orgId },
      include: {
        users: {
          where: { disabled: false },
          include: { user: { select: { providerName: true, providerId: true } } },
        },
      },
    });
    if (!org) return null;
    const firebaseUser = org.users.find(
      (uo) => uo.user.providerName === Provider.FIREBASE && uo.user.providerId
    );
    return firebaseUser?.user.providerId ?? null;
  }

  /**
   * Get plan details from Studio Tools API, with Redis caching.
   */
  async getPlanDetails(firebaseUid: string): Promise<PlanDetails | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${firebaseUid}`;
    const cached = await ioRedis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as PlanDetails;
      } catch {
        // Invalid cache, fetch fresh
      }
    }

    const apiUrl = process.env.STUDIO_TOOLS_API_URL;
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiUrl || !apiKey) {
      return null;
    }

    try {
      const url = `${apiUrl.replace(/\/$/, '')}/api/internal/plan-details?firebaseUid=${encodeURIComponent(firebaseUid)}`;
      const res = await fetch(url, {
        headers: {
          'X-Internal-Api-Key': apiKey,
        },
      });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as {
        socialChannels?: number;
        postizTier?: string;
        planName?: string;
      };
      const planDetails: PlanDetails = {
        socialChannels: data.socialChannels ?? 0,
        postizTier: data.postizTier ?? 'FREE',
        planName: data.planName ?? 'Free',
      };
      await ioRedis.set(
        cacheKey,
        JSON.stringify(planDetails),
        'EX',
        CACHE_TTL_SECONDS
      );
      return planDetails;
    } catch {
      return null;
    }
  }
}
