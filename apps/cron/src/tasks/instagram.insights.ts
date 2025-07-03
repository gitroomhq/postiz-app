import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class InstagramInsightsTask {
  constructor(
    private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
  ) { }

  // @Cron('* * * * *') // for every minute
  @Cron('0 0 * * *') // for midnight
  async handleInstagramInsights() {
    console.log('⏰ Cron job triggered');

    try {
      const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
        headers: {
          'cookie': process.env.INTERNEL_TOKEN,
          'Content-Type': 'application/json'
        }
      });

      const integrations = integrationsRes.data?.integrations || [];

      const instagramAccounts = integrations.filter(
        (i) => i.identifier === 'instagram' && i.internalId
      );

      if (!instagramAccounts.length) {
        console.log('❌ No Instagram accounts found.');
        return;
      }

      for (const account of instagramAccounts) {
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const businessId = account.internalId;
        const organizationId = account.customer?.orgId;

        try {
          // 1. Basic account data
          const basicRes = await axios.get(
            `https://graph.facebook.com/v19.0/${businessId}?fields=followers_count,follows_count,media_count&access_token=${accessToken}`
          );

          const { followers_count, follows_count, media_count } = basicRes.data;

          // 2. Reach for last 30 days

          const yesterday = subDays(new Date(), 1);
          const dayStart = Math.floor(startOfDay(yesterday).getTime() / 1000);
          const dayEnd = Math.floor(endOfDay(yesterday).getTime() / 1000);

          const reachRes = await axios.get(
            `https://graph.facebook.com/v19.0/${businessId}/insights?metric=reach&period=day&since=${dayStart}&until=${dayEnd}&access_token=${accessToken}`
          );

          const daily = reachRes.data?.data?.[0]?.values || [];
          // const impressions = daily.reduce((sum, day) => sum + day.value, 0);
          // const avgReachPerDay = impressions;
          const yesterdayReach = daily.find(day => {
            const endTime = new Date(day.end_time).getTime();
            return endTime >= dayStart * 1000 && endTime <= dayEnd * 1000;
          })?.value || 0;

          const impressions = yesterdayReach;
          const avgReachPerDay = yesterdayReach;


          const month = new Date().toISOString().slice(0, 7);

          console.log(`📤 Inserting for businessId ${businessId}, org ${organizationId}`);

          await this._instagramInsightsRepository.model.instagramInsight.create({
            data: {
              businessId,
              organizationId,
              customerId: account.customer?.id,// Add this line
              month,
              followers: followers_count,
              following: follows_count,
              totalContent: media_count,
              impressions,
              avgReachPerDay
            },
          });

          console.log(`✅ Inserted insight for ${businessId} at ${new Date().toISOString()}`);
        } catch (innerError) {
          console.error(`⚠️ Failed to insert for ${account.name}: ${innerError.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to fetch integrations or process insights: ${error.message}`);
    }
  }
}
