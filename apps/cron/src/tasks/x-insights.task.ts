import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class XInsightsTask {

  constructor(
    private _xInsightsRepository: PrismaRepository<'xInsight'>,
  ) { }

  @Cron('0 0 * * *') // for midnight
  async handleXInsights() {
    console.log('⏰ Twitter/X cron triggered');

    try {

      console.log("STEP 1: Fetching X integrations...");

      const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
        headers: {
          'cookie': process.env.INTERNEL_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      console.log("STEP 2: Fetching X integrations...");

      const integrations = integrationsRes.data?.integrations || [];

      console.log("STEP 3: Fetching X integrations...");

      const xAccounts = integrations.filter(
        (i) => i.identifier === 'x' && i.internalId
      );

      console.log("STEP 4: Fetching X integrations...");

      if (!xAccounts.length) {
        console.log('❌ No X (Twitter) accounts found.');
        return;
      }

      console.log("STEP 5: Fetching X integrations...");

      for (const account of xAccounts) {

        console.log("STEP 6: Fetching X integrations...");

        console.log('xAccounts', xAccounts)
        const businessId = account.internalId;
        const organizationId = account.customer?.orgId;

        try {
          // 1. Get basic metrics
          const basicRes = await axios.get(
            `https://api.twitter.com/2/users/${businessId}?user.fields=public_metrics`,
            {
              headers: {
                Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
              },
            }
          );

          console.log("STEP 7: Fetching X integrations...");

          const metrics = basicRes.data?.data?.public_metrics;

          console.log("STEP 8: Fetching X integrations...");

          if (!metrics) {
            console.warn(`⚠️ No metrics found for userId ${businessId}`);
            continue;
          }

          console.log("STEP 9: Fetching X integrations...");

          const { followers_count, following_count, tweet_count } = metrics;

          // 2. Get tweets from yesterday
          const yesterday = subDays(new Date(), 1);
          const start = startOfDay(yesterday).toISOString();
          const end = endOfDay(yesterday).toISOString();

          console.log("STEP 10: Fetching X integrations...");

          const tweetsRes = await axios.get(
            `https://api.twitter.com/2/users/${businessId}/tweets?max_results=100&start_time=${start}&end_time=${end}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
              },
            }
          );

          console.log("STEP 11: Fetching X integrations...");

          const tweets = tweetsRes.data?.data || [];
          const tweetIds = tweets.map(t => t.id);

          console.log("STEP 12: Fetching X integrations...");

          let totalInteractions = 0;

          console.log("STEP 13: Fetching X integrations...");


          if (tweetIds && tweetIds.length) {
            console.log("STEP 14: Fetching X integrations...");

            const metricsRes = await axios.get(
              `https://api.twitter.com/2/tweets?ids=${tweetIds.join(',')}&tweet.fields=public_metrics`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
                },
              }
            );

            console.log("STEP 15: Fetching X integrations...");

            totalInteractions = (metricsRes.data?.data || []).reduce((sum, t) => {
              const m = t.public_metrics || {};
              return sum + (m.like_count || 0) + (m.reply_count || 0) + (m.retweet_count || 0) + (m.quote_count || 0);
            }, 0);

            console.log("STEP 16: Fetching X integrations...");

          }

          console.log("STEP 17: Fetching X integrations...");

          const estimatedImpressions = Math.round(totalInteractions * 4); // Estimate impressions
          const engagement = (tweetIds && tweetIds.length) ? (totalInteractions / tweetIds.length) : 0;

          console.log("STEP 18: Fetching X integrations...");

          const month = new Date().toISOString().slice(0, 7);

          console.log("STEP 19: Fetching X integrations...");

          await this._xInsightsRepository.model.xInsight.create({
            data: {
              businessId: businessId,
              organizationId,
              customerId: account.customer?.id,// Add this line
              month,
              followers: followers_count,
              following: following_count,
              totalContent: tweetIds.length,
              impressions: estimatedImpressions,
              interactions: totalInteractions,
              engagement
            },
          });

          console.log("STEP 20: Fetching X integrations...");

          console.log(`✅ Inserted X insights for ${businessId}`);
        } catch (err) {
          console.error(`⚠️ Failed for ${account.name}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to fetch X integrations: ${err.message}`);
    }
  }
}
