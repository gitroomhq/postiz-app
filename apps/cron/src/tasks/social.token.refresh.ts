import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import dayjs = require('dayjs');
import * as qs from 'qs';

@Injectable()
export class SocialTokenRefreshTask {
  
  constructor(private _socialTokenRepo: PrismaRepository<'socialToken'>) {}

  @Cron('5 0 * * *') // Runs at 12:05 AM IST daily
  async handleGbpTokenRefresh() {

    console.log('⏰ SocialToken refresh cron triggered!');

    const tokens = await this._socialTokenRepo.model.socialToken.findMany({
      where: {
        refreshToken : { not : null },
        identifier   : 'gbp'
      }, 
    });

    for (const token of tokens) {

      console.log(`♻️ Refreshing token for ${token.identifier}...`);

      try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        const response = await axios.post(
          'https://oauth2.googleapis.com/token',
          qs.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: token.refreshToken,
            grant_type: 'refresh_token',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;

        console.log("✅ New access token:", access_token);
        console.log("✅ New refresh token:", newRefreshToken);
        console.log("✅ Token expiry in seconds:", expires_in);

        // ✅ Always upsert with same fields
        await this._socialTokenRepo.model.socialToken.upsert({
          where: { id: token.id },
          update: {
            accessToken: access_token,
            refreshToken: newRefreshToken || token.refreshToken,
            tokenExpiry: dayjs().add(expires_in, 'seconds').toDate(),
          },
          create: {
            identifier: 'gbp',
            businessId: 'locations/1151483555897051544',
            accessToken: access_token,
            refreshToken: newRefreshToken || token.refreshToken,
            tokenExpiry: dayjs().add(expires_in, 'seconds').toDate(),
          },
        });

        console.log(`✅ Refreshed ${token.identifier} ${token.businessId}`);
      } catch (err) {
        console.error(`❌ Failed to refresh ${token.identifier} ${token.businessId}: ${err.message}`);
      }
    }
  }

  @Cron('0 0 * * *') // Runs daily at midnight UTC
  async handleInstagramTokenRefresh() {
    console.log('⏰ Instagram Token Refresh Cron Triggered');

    const thresholdDays = parseInt('10',10);

    const tokens = await this._socialTokenRepo.model.socialToken.findMany({
      where: {
        identifier: 'instagram',
        tokenExpiry: {
          lte: dayjs().add(thresholdDays,'days').toDate()
        },
      },
    });

    if (!tokens.length) {
      console.log(`✅ No Instagram tokens need refresh (within next ${thresholdDays} days).`);
      return;
    }

    for (const token of tokens) {
      console.log(`♻️ Refreshing Instagram token (ID: ${token.identifier})`);

      try {
        const appId = process.env.INSTAGRAM_CLIENT_ID;
        const appSecret = process.env.INSTAGRAM_CLIENT_SECRET;

        const response = await axios.get(
          'https://graph.facebook.com/v19.0/oauth/access_token',
          {
            params: {
              grant_type: 'fb_exchange_token',
              client_id: appId,
              client_secret: appSecret,
              fb_exchange_token: token.accessToken
            },
          }
        );

        const { access_token, expires_in } = response.data;

        console.log(`✅ New Instagram token: ${access_token}`);
        console.log(`✅ Expires in: ${expires_in} seconds`);

        // Instagram Long-Lived Tokens usually expire in 60 days
        const safeExpiresIn = expires_in || (60 * 24 * 60 * 60); // 60 days in seconds

        await this._socialTokenRepo.model.socialToken.update({
          where: { id: token.id },
          data: {
            accessToken: access_token,
            tokenExpiry: dayjs().add(safeExpiresIn, 'seconds').toDate(),
          },
        });

        console.log(`✅ Refreshed Instagram token for ID: ${token.identifier}`);
      } catch (err) {
        console.error(`❌ Failed to refresh Instagram token ID ${token.identifier}: ${err.message}`);
      }
    }
  }

  @Cron('5 0 * * *') // Example: 12:05 AM daily IST
  async handleWebsiteTokenRefresh() {
    console.log('⏰ Website token refresh cron triggered!');

    const token = await this._socialTokenRepo.model.socialToken.findFirst({
      where: {
        identifier: 'website',
        refreshToken: { not: null }
      },
    });

    if (!token) {
      console.log('❌ No Website refresh token found.');
      return;
    }

    try {
      const clientId = process.env.GOOGLE_WEBSITE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_WEBSITE_CLIENT_SECRET;

      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: token.refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;

      await this._socialTokenRepo.model.socialToken.upsert({
        where: { id: token.id },
        update: {
          accessToken: access_token,
          refreshToken: newRefreshToken || token.refreshToken,
          tokenExpiry: dayjs().add(expires_in, 'seconds').toDate(),
        },
        create: {
          identifier: 'website',
          businessId: '475927440',
          accessToken: access_token,
          refreshToken: newRefreshToken || token.refreshToken,
          tokenExpiry: dayjs().add(expires_in, 'seconds').toDate(),
        },
      });

      console.log('✅ Website token refreshed!');
    } catch (err) {
      console.error(`❌ Failed to refresh Website token: ${err.message}`);
    }
  }
}
