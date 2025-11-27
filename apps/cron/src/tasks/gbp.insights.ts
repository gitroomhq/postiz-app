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

  @Cron('0 6 * * *') // Runs at 6:00 AM IST daily
  async handleGBPInsights() {
    console.log('⏰ GBP Insights - TEST RUN');

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

        // Log token status for debugging
        if (tokenEntry.tokenExpiry) {
          const timeUntilExpiry = (tokenEntry.tokenExpiry.getTime() - Date.now()) / 1000 / 60;
          if (timeUntilExpiry > 0) {
            console.log(`🕐 Token expires in ${timeUntilExpiry.toFixed(2)} minutes`);
          } else {
            console.log(`⏰ Token expired ${Math.abs(timeUntilExpiry).toFixed(2)} minutes ago`);
          }
        } else {
          console.log('⚠️ No token expiry information available');
        }

        // Check if token is expired or expires soon (with 5-minute buffer)
        // This prevents race conditions where token expires during API calls
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        const expiryThreshold = new Date(Date.now() + bufferTime);

        let accessToken = tokenEntry.accessToken;
        if (tokenEntry.tokenExpiry && tokenEntry.tokenExpiry < expiryThreshold) {
          console.log('⚠️ Access token expired or expiring soon (within 5 minutes), attempting to refresh...');
          try {
            // Call the backend API to refresh the token
            const refreshRes = await axios.post(
              `${process.env.BACKEND_INTERNAL_URL}/integrations/refresh-token`,
              { refreshToken: tokenEntry.refreshToken },
              {
                headers: {
                  cookie: process.env.INTERNEL_TOKEN,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (refreshRes.data?.accessToken) {
              accessToken = refreshRes.data.accessToken;
              console.log('✅ Token refreshed successfully - valid for next 60 minutes');
            } else {
              console.log('❌ Failed to refresh token');
              return;
            }
          } catch (refreshError) {
            console.log('❌ Error refreshing token:', refreshError.message);
            return;
          }
        } else {
          console.log('✅ Token is valid and fresh - no refresh needed');
        }

      for (const account of gbpAccounts) {

        const locationId = account?.internalId;
        const orgId = account.customer?.orgId;
        const customerId = account?.customerId;

        // Validate required fields
        if (!locationId) {
          console.log('⚠️ Skipping account with missing internalId');
          continue;
        }

        if (!locationId.startsWith('locations/')) {
          console.log(`⚠️ Skipping invalid locationId format: ${locationId} (should start with "locations/")`);
          continue;
        }

        if (!orgId) {
          console.log(`⚠️ Skipping ${locationId} - missing organizationId`);
          continue;
        }

        console.log(`\n📍 Processing location: ${locationId}`);
        console.log(`   Organization: ${orgId}`);
        console.log(`   Customer: ${customerId || 'none'}`);

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
        let impressionsDesktopSearch = 0;
        let impressionsMobileSearch = 0;
        let impressionsDesktopMaps = 0;
        let impressionsMobileMaps = 0;
        let impressionsSearch = 0;
        let impressionsMaps = 0;

        try {
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

          impressionsSearch = impressionsDesktopSearch + impressionsMobileSearch;
          impressionsMaps = impressionsDesktopMaps + impressionsMobileMaps;

          console.log({
            impressionsDesktopSearch,
            impressionsMobileSearch,
            impressionsDesktopMaps,
            impressionsMobileMaps,
            impressionsSearch,
            impressionsMaps,
          });
        } catch (impressionsError) {
          console.log(`⚠️ Could not fetch impressions for ${locationId}: ${impressionsError?.response?.data?.error?.message || impressionsError.message}`);
          // Continue with zero values if permission denied
        }

        // 5️⃣ Fetch Clicks
        let websiteClicks = 0;
        let phoneClicks = 0;
        let directionRequests = 0;

        try {
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
        } catch (clicksError) {
          console.log(`⚠️ Could not fetch clicks for ${locationId}: ${clicksError?.response?.data?.error?.message || clicksError.message}`);
          // Continue with zero values if permission denied
        }

        // 6️⃣ Fetch Reviews
        // Note: Reviews endpoint requires the full location path (e.g., accounts/12345/locations/67890)
        // The locationId already contains the full path like "locations/1234567890"
        let reviews = [];
        let totalReviews = 0;
        let avgRating = 0;

        try {
          const reviewsRes = await axios.get(
            `https://mybusiness.googleapis.com/v4/${locationId}/reviews`,
            {
              headers: {
                  Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          reviews = reviewsRes.data?.reviews || [];
          totalReviews = reviews.length;
          avgRating = reviews.length
            ? reviews.reduce((sum, r) => sum + (Number(r.starRating) || 0), 0) / reviews.length
            : 0;
        } catch (reviewError) {
          console.log(`⚠️ Could not fetch reviews for ${locationId}: ${reviewError?.response?.data?.error?.message || reviewError.message}`);
          // Continue without reviews data if permission denied
        }


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
