import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import qs from 'qs';

@Injectable()
export class GBPInsightsTask {
  
  constructor(
    private _gbpInsightsRepository: PrismaRepository<'gbpInsight'>,
    private _socialTokenRepo: PrismaRepository<'socialToken'> 
  ) {}

  @Cron('20 0 * * *') // Runs at 12:20 AM IST daily
  async handleGBPInsights() {
    console.log('⏰ GBP Cron job triggered');

    try {
      
      // 1️⃣ Get GBP integrations
      const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
        headers: {
          cookie: process.env.INTERNEL_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      const integrations = integrationsRes.data?.integrations || [];
      const gbpAccounts = integrations.filter(i => i.identifier === 'gbp' && i.internalId);


      if (!gbpAccounts.length) {
        console.log('❌ No GBP accounts found.');
        return;
      }

      const tokenEntry = await this._socialTokenRepo.model.socialToken.findFirst({
          where: {
            identifier: 'gbp',
            refreshToken: { not: null },
            accessToken: { not: null }
          },
          orderBy: { updatedAt: 'desc' },
        });

        if (!tokenEntry?.accessToken) {
          console.log('❌ No valid GBP access token found.');
          return;
        }
        const accessToken = tokenEntry.accessToken;

      for (const account of gbpAccounts) {

        const locationId = account?.internalId;
        const orgId = account.customer?.orgId;
        const customerId = account?.customerId;

        // 2️⃣ Date range: use YESTERDAY only!
        const yesterday = subDays(new Date(), 1);
        const start_date = {
          year: yesterday.getFullYear(),
          month: yesterday.getMonth() + 1,
          day: yesterday.getDate(),
        };
        const end_date = start_date;

        const month = format(yesterday, 'yyyy-MM');



        // 3️⃣ Check if data already exists
        const exists = await this._gbpInsightsRepository.model.gbpInsight.findFirst({
          where: {
            businessId: locationId,
            createdAt: {
              gte: startOfDay(yesterday),
              lte: endOfDay(yesterday)
            },
          },
        });


        if (exists) {
          console.log(`⚠️ GBP Insight already exists for ${locationId} (${format(yesterday, 'yyyy-MM-dd')})`);
          continue; 
        }


        // 4️⃣ Fetch Impressions - All devices & surfaces
        const impressionsRes = await axios.get(
          `https://businessprofileperformance.googleapis.com/v1/${locationId}:fetchMultiDailyMetricsTimeSeries`,
          {
            params: {
              dailyMetrics: [
                'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
                'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
                'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
                'BUSINESS_IMPRESSIONS_MOBILE_MAPS'
              ],
              'dailyRange.start_date.year': start_date.year,
              'dailyRange.start_date.month': start_date.month,
              'dailyRange.start_date.day': start_date.day,
              'dailyRange.end_date.year': end_date.year,
              'dailyRange.end_date.month': end_date.month,
              'dailyRange.end_date.day': end_date.day,
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            paramsSerializer: params => {
              return qs.stringify(params, { arrayFormat: 'repeat' });
            }
          },
        );

        const impressionsData = impressionsRes.data?.timeSeries || [];
        let impressionsDesktopSearch = 0;
        let impressionsMobileSearch = 0;
        let impressionsDesktopMaps = 0;
        let impressionsMobileMaps = 0;

        for (const metric of impressionsData) {
          const total = metric?.timeSeries?.reduce((sum, d) => sum + d.value, 0);
          switch (metric.metric) {
            case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
              impressionsDesktopSearch = total;
              break;
            case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
              impressionsMobileSearch = total;
              break;
            case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
              impressionsDesktopMaps = total;
              break;
            case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
              impressionsMobileMaps = total;
              break;
          }
        }

        const impressionsSearch = impressionsDesktopSearch + impressionsMobileSearch;
        const impressionsMaps = impressionsDesktopMaps + impressionsMobileMaps;
        const impressionsAll = impressionsSearch + impressionsMaps;

        console.log({
          impressionsDesktopSearch,
          impressionsMobileSearch,
          impressionsDesktopMaps,
          impressionsMobileMaps,
          impressionsSearch,
          impressionsMaps,
          impressionsAll,
        });

        // 5️⃣ Fetch Clicks
        const clicksRes = await axios.get(
          `https://businessprofileperformance.googleapis.com/v1/${locationId}:fetchMultiDailyMetricsTimeSeries`,
          {
            params: {
              dailyMetrics: [
                'WEBSITE_CLICKS',
                'CALL_CLICKS',
                'BUSINESS_DIRECTION_REQUESTS',
              ],
              'dailyRange.start_date.year': start_date.year,
              'dailyRange.start_date.month': start_date.month,
              'dailyRange.start_date.day': start_date.day,
              'dailyRange.end_date.year': end_date.year,
              'dailyRange.end_date.month': end_date.month,
              'dailyRange.end_date.day': end_date.day,
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            paramsSerializer: params => {
              return qs.stringify(params, { arrayFormat: 'repeat' });
            }
          },
        );

        const clicksData = clicksRes.data?.timeSeries || [];
        let websiteClicks = 0;
        let phoneClicks = 0;
        let directionRequests = 0;

        for (const metric of clicksData) {
          if (metric.metric === 'WEBSITE_CLICKS') {
            websiteClicks = metric?.timeSeries?.reduce((sum, d) => sum + d.value, 0);
          }
          if (metric.metric === 'CALL_CLICKS') {
            phoneClicks = metric?.timeSeries?.reduce((sum, d) => sum + d.value, 0);
          }
          if (metric.metric === 'BUSINESS_DIRECTION_REQUESTS') {
            directionRequests = metric?.timeSeries?.reduce((sum, d) => sum + d.value, 0);
          }
        }

        // 6️⃣ Fetch Reviews
        const reviewsRes = await axios.get(
          `https://mybusiness.googleapis.com/v4/accounts/${process.env.GBP_ACCOUNT_ID}/${locationId}/reviews`,
          {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
          },
        );


        const reviews = reviewsRes.data?.reviews || [];
        const totalReviews = reviews.length;
        const avgRating = reviews.length
          ? reviews.reduce((sum, r) => sum + (Number(r.starRating) || 0), 0) / reviews.length
          : 0;


        // 7️⃣ Insert daily record
        await this._gbpInsightsRepository.model.gbpInsight.create({
          data: {
            businessId: locationId,
            organizationId: orgId,
            customerId,
            month,
            impressionsMaps,
            impressionsSearch,
            websiteClicks,
            phoneClicks,
            directionRequests,
            avgRating,
            totalReviews,
            createdAt: yesterday
          },
        });


        console.log(`✅ Inserted GBP Insight for ${locationId} (${format(yesterday, 'yyyy-MM-dd')})`);
      }
    } catch (error) {
      console.error(`❌ GBP Cron failed: ${error.message}`, error?.response?.data || '');
    }
  }

}
