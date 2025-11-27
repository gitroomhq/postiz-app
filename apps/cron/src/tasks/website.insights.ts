import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class WebsiteInsightsTask {
  constructor(
    private _websitePerformanceRepo: PrismaRepository<'websitePerformance'>,
    private _websiteLocationRepo: PrismaRepository<'websiteLocation'>,
    private _socialTokenRepo: PrismaRepository<'socialToken'> 
  ) {}

  @Cron('0 8 * * *') // Runs at 8:00 AM IST daily
  async handleWebsiteInsights() {
    console.log('⏰ Website Analytics Cron job triggered');

    try {
      // 1️⃣ Get all website integrations
      const integrations = await this.getWebsiteIntegrations();
      if (!integrations.length) {
        console.log('❌ No website accounts found.');
        return;
      }

      // 2️⃣ Process each account
      for (const account of integrations) {
        await this.processAccount(account);
      }
    } catch (error) {
      console.error(`❌ Website Cron failed: ${error.message}`, error?.response?.data || '');
    }
  }

  private async getWebsiteIntegrations() {
    const res = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
      headers: {
        cookie: process.env.INTERNEL_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    return res.data?.integrations?.filter(i => i.identifier === 'website' && i.internalId) || [];
  }

  private async processAccount(account: any) {
    const { internalId: businessId, customer } = account;
    const orgId = customer?.orgId;
    const customerId = account.customerId;
    const yesterday = subDays(new Date(), 1);
    const startDate = format(yesterday, 'yyyy-MM-dd');
    const month = format(yesterday, 'yyyy-MM');

    try {
      // 1️⃣ Check if data already exists
      if (await this.dataExists(businessId, yesterday)) {
        console.log(`⚠️ Data exists for ${businessId} (${startDate})`);
        return;
      }

      // 2️⃣ Fetch performance metrics
      const { pageViews, visits, visitors } = await this.fetchPerformanceMetrics(
        businessId,
        startDate
      );

      // 3️⃣ Save performance data
      await this._websitePerformanceRepo.model.websitePerformance.create({
        data: {
          businessId,
          organizationId: orgId,
          customerId,
          month,
          pageViews,
          visits,
          visitors,
          createdAt: yesterday
        }
      });

      // 4️⃣ Fetch and save top 10 countries
      await this.processLocationData(
        businessId,
        orgId,
        customerId,
        startDate,
        month,
        yesterday,
        visitors
      );

      console.log(`✅ Saved data for ${businessId} (${startDate})`);
    } catch (error) {
      console.error(`❌ Failed to process ${businessId}:`, error.message);
    }
  }

  private async dataExists(businessId: string, date: Date) {
    return this._websitePerformanceRepo.model.websitePerformance.findFirst({
      where: {
        businessId,
        createdAt: {
          gte: startOfDay(date),
          lte: endOfDay(date)
        },
      },
    });
  }

  private async fetchPerformanceMetrics(
    businessId: string,
    date: string
  ) {
    const data = await this.fetchAnalyticsData(businessId, {
      startDate: date,
      endDate: date,
      metrics: ['screenPageViews', 'sessions', 'totalUsers']
    });

    return {
      pageViews: data.metrics?.['screenPageViews'] || 0,
      visits: data.metrics?.['sessions'] || 0,
      visitors: data.metrics?.['totalUsers'] || 0
    };
  }

  private async processLocationData(
    businessId: string,
    orgId: string,
    customerId: string,
    date: string,
    month: string,
    yesterday: Date,
    totalVisitors: number
  ) {
    if (totalVisitors <= 0) return;

    // Fetch top 10 countries ordered by visitors (descending)
    const locationData = await this.fetchAnalyticsData(businessId, {
      startDate: date,
      endDate: date,
      dimensions: ['country'],
      metrics: ['totalUsers'],
      limit: 10,
      orderBy: { metric: { metricName: 'totalUsers' }, desc: true }
    });

    const locationRecords = locationData.rows.map((row, index) => ({
      businessId,
      organizationId: orgId,
      customerId,
      month,
      country: row.dimensions.country || 'Unknown',
      visitors: row.metrics.totalUsers || 0,
      percent: (row.metrics.totalUsers / totalVisitors) * 100,
      rank: index + 1, // 1-based ranking (1 = highest)
      createdAt: yesterday
    }));

    if (locationRecords.length > 0) {
      await this._websiteLocationRepo.model.websiteLocation.createMany({
        data: locationRecords
      });
    }
  }

  private async fetchAnalyticsData(
    businessId: string,
    options: {
      startDate: string;
      endDate: string;
      metrics: string[];
      dimensions?: string[];
      limit?: number;
      orderBy?: any;
    }
  ) {

      const tokenEntry = await this._socialTokenRepo.model.socialToken.findFirst({
          where: {
            identifier: 'website',
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

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${businessId}:runReport`,
      {
        dateRanges: [{
          startDate: options.startDate,
          endDate: options.endDate
        }],
        metrics: options.metrics.map(name => ({ name })),
        dimensions: options.dimensions?.map(name => ({ name })),
        orderBys: options.orderBy ? [options.orderBy] : undefined,
        limit: options.limit
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return this.transformAnalyticsResponse(response.data);
  }

  private transformAnalyticsResponse(data: any) {
    const result = {
      metrics: {},
      rows: []
    };

    if (!data.rows) return result;

    // Process metrics (when no dimensions)
    if (!data.dimensionHeaders?.length && data.metricHeaders?.length) {
      data.metricHeaders.forEach((header, i) => {
        result.metrics[header.name] = parseInt(data.rows[0]?.metricValues[i]?.value || 0, 10);
      });
    }

    // Process rows (for location data)
    result.rows = data.rows.map(row => {
      const rowData: any = { dimensions: {}, metrics: {} };

      data.dimensionHeaders?.forEach((header, i) => {
        rowData.dimensions[header.name] = row.dimensionValues[i]?.value || '';
      });

      data.metricHeaders?.forEach((header, i) => {
        rowData.metrics[header.name] = parseInt(row.metricValues[i]?.value || 0, 10);
      });

      return rowData;
    });

    return result;
  }


}