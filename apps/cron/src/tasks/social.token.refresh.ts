import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import dayjs = require('dayjs');
import * as qs from 'qs';

@Injectable()
export class SocialTokenRefreshTask {
  constructor(
    private _socialTokenRepo: PrismaRepository<'socialToken'>,
    private _notificationService: NotificationService,
    private _integrationRepo: PrismaRepository<'integration'>
  ) { }

  @Cron('30 6 * * *') // Runs at 6:30 AM IST daily
  async handleGbpTokenRefresh() {

    console.log('⏰ GBP Token Refresh - Auto Reconnect');

    // Refresh GBP integrations from Integration table
    const thresholdDays = 5;
    const integrations = await this._integrationRepo.model.integration.findMany({
      where: {
        providerIdentifier: 'gbp',
        refreshToken: { not: null },
        tokenExpiration: {
          lte: dayjs().add(thresholdDays, 'days').toDate(),
        },
        deletedAt: null,
      },
    });

    console.log(`📊 Found ${integrations.length} GBP integrations to refresh`);

    for (const integration of integrations) {
      if (integration.tokenExpiration) {
        const daysUntilExpiry = dayjs(integration.tokenExpiration).diff(dayjs(), 'days');
        console.log(`🕐 Token for ${integration.name} expires in ${daysUntilExpiry} days`);
      }

      console.log(`♻️ Auto-refreshing GBP token for ${integration.name}...`);

      try {
        const response = await axios.post(
          `${process.env.BACKEND_INTERNAL_URL}/integrations/refresh-token`,
          { refreshToken: integration.refreshToken },
          {
            headers: {
              'cookie': process.env.INTERNEL_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
        const newExpiryDate = dayjs().add(expiresIn, 'seconds').toDate();

        await this._integrationRepo.model.integration.update({
          where: { id: integration.id },
          data: {
            token: accessToken,
            refreshToken: newRefreshToken || integration.refreshToken,
            tokenExpiration: newExpiryDate,
            refreshNeeded: false,
          },
        });

        console.log(`✅ Successfully auto-refreshed GBP token for ${integration.name}\n`);
      } catch (err) {
        console.error(`❌ Failed to auto-refresh GBP token ${integration.name}: ${err.message}`);
      }
    }

    // Also refresh socialToken table entries
    const tokens = await this._socialTokenRepo.model.socialToken.findMany({
      where: {
        refreshToken : { not : null },
        identifier   : 'gbp'
      },
    });

    console.log(`📊 Found ${tokens.length} GBP social tokens to refresh`);

    for (const token of tokens) {

      if (token.tokenExpiry) {
        const timeUntilExpiry = (token.tokenExpiry.getTime() - Date.now()) / 1000 / 60;
        if (timeUntilExpiry > 0) {
          console.log(`🕐 Token for ${token.businessId} expires in ${timeUntilExpiry.toFixed(2)} minutes`);
        } else {
          console.log(`⏰ Token for ${token.businessId} expired ${Math.abs(timeUntilExpiry).toFixed(2)} minutes ago`);
        }
      }

      console.log(`♻️ Refreshing social token for ${token.identifier} ${token.businessId}...`);

      try {
        const response = await axios.post(
          `${process.env.BACKEND_INTERNAL_URL}/integrations/refresh-token`,
          { refreshToken: token.refreshToken },
          {
            headers: {
              'cookie': process.env.INTERNEL_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        const { accessToken: access_token, expiresIn: expires_in, refreshToken: newRefreshToken } = response.data;

        const newExpiryDate = dayjs().add(expires_in, 'seconds').toDate();
        const expiryMinutes = expires_in / 60;

        console.log(`✅ New access token received (first 20 chars): ${access_token.substring(0, 20)}...`);
        console.log(`✅ Token will be valid for ${expiryMinutes} minutes (until ${dayjs(newExpiryDate).format('HH:mm:ss')})`);
        if (newRefreshToken) {
          console.log(`✅ New refresh token received`);
        } else {
          console.log(`✅ Using existing refresh token`);
        }

        await this._socialTokenRepo.model.socialToken.upsert({
          where: { id: token.id },
          update: {
            accessToken: access_token,
            refreshToken: newRefreshToken || token.refreshToken,
            tokenExpiry: newExpiryDate,
          },
          create: {
            identifier: 'gbp',
            businessId: 'locations/1151483555897051544',
            accessToken: access_token,
            refreshToken: newRefreshToken || token.refreshToken,
            tokenExpiry: newExpiryDate,
          },
        });

        console.log(`✅ Successfully refreshed token for ${token.identifier} ${token.businessId}`);
      } catch (err) {
        console.error(`❌ Failed to refresh ${token.identifier} ${token.businessId}: ${err.message}`);
        if (err.response?.data) {
          console.error(`❌ Error details:`, err.response.data);
        }
      }
    }

    console.log(`✅ GBP auto-reconnect completed - processed ${integrations.length} integrations and ${tokens.length} tokens`);
  }
            identifier: 'gbp',
            businessId: 'locations/1151483555897051544',
            accessToken: access_token,
            refreshToken: newRefreshToken || token.refreshToken,
            tokenExpiry: newExpiryDate,
          },
        });

        console.log(`✅ Successfully refreshed token for ${token.identifier} ${token.businessId}`);
      } catch (err) {
        console.error(`❌ Failed to refresh ${token.identifier} ${token.businessId}: ${err.message}`);
        if (err.response?.data) {
          console.error(`❌ Error details:`, err.response.data);
        }
      }
    }

    console.log(`✅ GBP token refresh completed - processed ${tokens.length} tokens`);
  }

  @Cron('30 8 * * *') // Runs at 8:30 AM IST daily
  async handleWebsiteTokenRefresh() {
    console.log('⏰ Website Token Refresh - TEST RUN');

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

  @Cron('30 5 * * *') // Runs at 5:30 AM IST daily
  async handleLinkedInTokenRefresh() {
    console.log('⏰ LinkedIn Token Refresh - TEST RUN');

    // Refresh tokens expiring within 10 days proactively
    const thresholdDays = 10;

    // Read from Integration table instead of SocialToken
    const integrations = await this._integrationRepo.model.integration.findMany({
      where: {
        providerIdentifier: { in: ['linkedin', 'linkedin-page'] },
        refreshToken: { not: null },
        tokenExpiration: {
          lte: dayjs().add(thresholdDays, 'days').toDate(),
        },
        deletedAt: null,
      },
    });

    if (!integrations.length) {
      console.log(`✅ No LinkedIn integrations need refresh (within next ${thresholdDays} days).`);
      return;
    }

    console.log(`📊 Found ${integrations.length} LinkedIn integrations to refresh`);

    for (const integration of integrations) {
      // Log current token status before refresh
      if (integration.tokenExpiration) {
        const daysUntilExpiry = dayjs(integration.tokenExpiration).diff(dayjs(), 'days');
        const hoursUntilExpiry = dayjs(integration.tokenExpiration).diff(dayjs(), 'hours');
        console.log(`🕐 Token for ${integration.name} (${integration.providerIdentifier}) expires in ${daysUntilExpiry} days (${hoursUntilExpiry} hours)`);
      }

      console.log(`♻️ Refreshing LinkedIn token for ${integration.name}...`);

      try {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error('❌ LinkedIn credentials not configured');
          continue;
        }

        const response = await axios.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          qs.stringify({
            grant_type: 'refresh_token',
            refresh_token: integration.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;

        // Calculate new expiry time
        const newExpiryDate = dayjs().add(expires_in, 'seconds').toDate();
        const expiryDays = expires_in / (60 * 60 * 24);

        console.log(`✅ New access token received (first 20 chars): ${access_token.substring(0, 20)}...`);
        console.log(`✅ Token will be valid for ${expiryDays.toFixed(1)} days (until ${dayjs(newExpiryDate).format('YYYY-MM-DD HH:mm:ss')})`);
        if (newRefreshToken) {
          console.log(`✅ New refresh token received`);
        } else {
          console.log(`✅ Using existing refresh token`);
        }

        await this._integrationRepo.model.integration.update({
          where: { id: integration.id },
          data: {
            token: access_token,
            refreshToken: newRefreshToken || integration.refreshToken,
            tokenExpiration: newExpiryDate,
          },
        });

        console.log(`✅ Successfully refreshed LinkedIn token for ${integration.name}\n`);
      } catch (err) {
        console.error(`❌ Failed to refresh LinkedIn token ${integration.name}: ${err.message}`);
        if (err.response?.data) {
          console.error(`❌ Error details:`, err.response.data);
        }
        // Send email notification if refresh fails
        await this.sendExpiryEmail({
          businessId: integration.internalId,
          name: integration.name,
          tokenExpiry: integration.tokenExpiration,
        });
      }
    }

    console.log(`✅ LinkedIn token refresh completed - processed ${integrations.length} integrations`);
  }

  @Cron('0 0 * * *') // Runs daily at midnight UTC - BACKUP CHECK
  async checkLinkedInTokenExpiry() {

    console.log('⏰ LinkedIn Backup Check - TEST RUN');

    // This is now a backup - only sends email if automatic refresh failed
    const thresholdDays = 5; // Reduced from 10 since we have automatic refresh

    const integrations = await this._integrationRepo.model.integration.findMany({
      where: {
        providerIdentifier: { in: ['linkedin', 'linkedin-page'] },
        tokenExpiration: {
          lte: dayjs().add(thresholdDays, 'days').toDate(),
        },
        deletedAt: null,
      },
    });

    if (!integrations.length) {
      console.log(`✅ No LinkedIn integrations expiring within ${thresholdDays} days.`);
      return;
    }

    for (const integration of integrations) {
      console.log(`⚠️ LinkedIn integration still expiring soon for ${integration.name} - automatic refresh may have failed`);
      await this.sendExpiryEmail({
        businessId: integration.internalId,
        name: integration.name,
        tokenExpiry: integration.tokenExpiration,
      });
    }
  }

  @Cron('30 7 * * *') // Runs at 7:30 AM IST daily
  async handleYouTubeTokenRefresh() {
    console.log('⏰ YouTube Token Refresh - TEST RUN');

    const token = await this._socialTokenRepo.model.socialToken.findFirst({
      where: {
        identifier: 'youtube',
        refreshToken: { not: null }
      },
    });

    if (!token) {
      console.log('❌ No YouTube refresh token found.');
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
          identifier: 'youtube',
          businessId: '114098237445558162556', 
          accessToken: access_token,
          refreshToken: newRefreshToken || token.refreshToken,
          tokenExpiry: dayjs().add(expires_in, 'seconds').toDate(),
          },
        });

      console.log('✅ YouTube token refreshed!');
      } catch (err) {
      console.error(`❌ Failed to refresh YouTube token: ${err.message}`);
    }
  }

  @Cron('30 2 * * *') // Runs at 2:30 AM IST daily
  async handleInstagramTokenRefresh() {
    console.log('⏰ Instagram Token Refresh Cron Triggered');

    const thresholdDays = 10;

    const integrations = await this._integrationRepo.model.integration.findMany({
      where: {
        providerIdentifier: 'instagram',
        refreshToken: { not: null },
        tokenExpiration: {
          lte: dayjs().add(thresholdDays, 'days').toDate(),
        },
        deletedAt: null,
      },
    });

    if (!integrations.length) {
      console.log(`✅ No Instagram integrations need refresh (within next ${thresholdDays} days).`);
      return;
    }

    console.log(`📊 Found ${integrations.length} Instagram integrations to refresh`);

    for (const integration of integrations) {
      if (integration.tokenExpiration) {
        const daysUntilExpiry = dayjs(integration.tokenExpiration).diff(dayjs(), 'days');
        console.log(`🕐 Token for ${integration.name} expires in ${daysUntilExpiry} days`);
      }

      console.log(`♻️ Refreshing Instagram token for ${integration.name}...`);

      try {
        const response = await axios.post(
          `${process.env.BACKEND_INTERNAL_URL}/integrations/refresh-token`,
          { refreshToken: integration.refreshToken },
          {
            headers: {
              'cookie': process.env.INTERNEL_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
        const newExpiryDate = dayjs().add(expiresIn, 'seconds').toDate();

        await this._integrationRepo.model.integration.update({
          where: { id: integration.id },
          data: {
            token: accessToken,
            refreshToken: newRefreshToken || integration.refreshToken,
            tokenExpiration: newExpiryDate,
          },
        });

        console.log(`✅ Successfully refreshed Instagram token for ${integration.name}\n`);
      } catch (err) {
        console.error(`❌ Failed to refresh Instagram token ${integration.name}: ${err.message}`);
      }
    }

    console.log(`✅ Instagram token refresh completed - processed ${integrations.length} integrations`);
  }

  @Cron('30 1 * * *') // Runs at 1:30 AM IST daily
  async handleFacebookTokenRefresh() {
    console.log('⏰ Facebook Token Refresh Cron Triggered');

    const thresholdDays = 10;

    const integrations = await this._integrationRepo.model.integration.findMany({
      where: {
        providerIdentifier: 'facebook',
        refreshToken: { not: null },
        tokenExpiration: {
          lte: dayjs().add(thresholdDays, 'days').toDate(),
        },
        deletedAt: null,
      },
    });

    if (!integrations.length) {
      console.log(`✅ No Facebook integrations need refresh (within next ${thresholdDays} days).`);
      return;
    }

    console.log(`📊 Found ${integrations.length} Facebook integrations to refresh`);

    for (const integration of integrations) {
      if (integration.tokenExpiration) {
        const daysUntilExpiry = dayjs(integration.tokenExpiration).diff(dayjs(), 'days');
        console.log(`🕐 Token for ${integration.name} expires in ${daysUntilExpiry} days`);
      }

      console.log(`♻️ Refreshing Facebook token for ${integration.name}...`);

      try {
        const response = await axios.post(
          `${process.env.BACKEND_INTERNAL_URL}/integrations/refresh-token`,
          { refreshToken: integration.refreshToken },
          {
            headers: {
              'cookie': process.env.INTERNEL_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
        const newExpiryDate = dayjs().add(expiresIn, 'seconds').toDate();

        await this._integrationRepo.model.integration.update({
          where: { id: integration.id },
          data: {
            token: accessToken,
            refreshToken: newRefreshToken || integration.refreshToken,
            tokenExpiration: newExpiryDate,
          },
        });

        console.log(`✅ Successfully refreshed Facebook token for ${integration.name}\n`);
      } catch (err) {
        console.error(`❌ Failed to refresh Facebook token ${integration.name}: ${err.message}`);
      }
    }

    console.log(`✅ Facebook token refresh completed - processed ${integrations.length} integrations`);
  }

  @Cron('30 3 * * *') // Runs at 3:30 AM IST daily
  async handleThreadsTokenRefresh() {
    console.log('⏰ Threads Token Refresh Cron Triggered');

    const thresholdDays = 10;

    const integrations = await this._integrationRepo.model.integration.findMany({
      where: {
        providerIdentifier: 'threads',
        refreshToken: { not: null },
        tokenExpiration: {
          lte: dayjs().add(thresholdDays, 'days').toDate(),
        },
        deletedAt: null,
      },
    });

    if (!integrations.length) {
      console.log(`✅ No Threads integrations need refresh (within next ${thresholdDays} days).`);
      return;
    }

    console.log(`📊 Found ${integrations.length} Threads integrations to refresh`);

    for (const integration of integrations) {
      if (integration.tokenExpiration) {
        const daysUntilExpiry = dayjs(integration.tokenExpiration).diff(dayjs(), 'days');
        console.log(`🕐 Token for ${integration.name} expires in ${daysUntilExpiry} days`);
      }

      console.log(`♻️ Refreshing Threads token for ${integration.name}...`);

      try {
        const response = await axios.post(
          `${process.env.BACKEND_INTERNAL_URL}/integrations/refresh-token`,
          { refreshToken: integration.refreshToken },
          {
            headers: {
              'cookie': process.env.INTERNEL_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
        const newExpiryDate = dayjs().add(expiresIn, 'seconds').toDate();

        await this._integrationRepo.model.integration.update({
          where: { id: integration.id },
          data: {
            token: accessToken,
            refreshToken: newRefreshToken || integration.refreshToken,
            tokenExpiration: newExpiryDate,
          },
        });

        console.log(`✅ Successfully refreshed Threads token for ${integration.name}\n`);
      } catch (err) {
        console.error(`❌ Failed to refresh Threads token ${integration.name}: ${err.message}`);
      }
    }

    console.log(`✅ Threads token refresh completed - processed ${integrations.length} integrations`);
  }

  @Cron('30 6 * * *') // Runs at 6:30 AM IST daily (before Pinterest insights at 7:00 AM)
  async handlePinterestTokenRefresh() {
    console.log('⏰ Pinterest Token Refresh Cron Triggered');

    const thresholdDays = 10;

    const integrations = await this._integrationRepo.model.integration.findMany({
      where: {
        providerIdentifier: 'pinterest',
        refreshToken: { not: null },
        tokenExpiration: {
          lte: dayjs().add(thresholdDays, 'days').toDate(),
        },
        deletedAt: null,
      },
    });

    if (!integrations.length) {
      console.log(`✅ No Pinterest integrations need refresh (within next ${thresholdDays} days).`);
      return;
    }

    console.log(`📊 Found ${integrations.length} Pinterest integrations to refresh`);

    for (const integration of integrations) {
      if (integration.tokenExpiration) {
        const daysUntilExpiry = dayjs(integration.tokenExpiration).diff(dayjs(), 'days');
        console.log(`🕐 Token for ${integration.name} expires in ${daysUntilExpiry} days`);
      }

      console.log(`♻️ Refreshing Pinterest token for ${integration.name}...`);

      try {
        const response = await axios.post(
          `${process.env.BACKEND_INTERNAL_URL}/integrations/refresh-token`,
          { refreshToken: integration.refreshToken },
          {
            headers: {
              'cookie': process.env.INTERNEL_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
        const newExpiryDate = dayjs().add(expiresIn, 'seconds').toDate();

        await this._integrationRepo.model.integration.update({
          where: { id: integration.id },
          data: {
            token: accessToken,
            refreshToken: newRefreshToken || integration.refreshToken,
            tokenExpiration: newExpiryDate,
          },
        });

        console.log(`✅ Successfully refreshed Pinterest token for ${integration.name}\n`);
      } catch (err) {
        console.error(`❌ Failed to refresh Pinterest token ${integration.name}: ${err.message}`);
      }
    }

    console.log(`✅ Pinterest token refresh completed - processed ${integrations.length} integrations`);
  }

  async sendExpiryEmail(token: any) {

    const message = `
      Hello,
      Your LinkedIn token for businessId : ${token.businessId} , Name :${token.name} is expiring on ${dayjs(token.tokenExpiry).format('DD-MM-YYYY')}.
      Please re-authorize your linkedIn account to avoid disruption.
      Thanks!
    `;

    await this._notificationService.sendEmail(
      ['pathansafvan131@gmail.com','zaidupstrapp@gmail.com'],
      'LinkedIn Token Expiry Warning',
      message,
      undefined,
      ['pathansafvan131@gmail.com','zaidupstrapp@gmail.com']
    );

    console.log(`✅ Expiry email sent successfully for LinkedIn token ID ${token.businessId}`);
  }

}
