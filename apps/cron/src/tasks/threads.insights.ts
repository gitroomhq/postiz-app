import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class ThreadsInsightsTask {
	constructor(
		private _threadsInsightsRepository: PrismaRepository<'threadsInsight'>,
	) { }

    @Cron('0 3 * * *') // Runs at 3:00 AM IST daily
	async handleThreadsInsights() {
		console.log('⏰ Threads Insights - TEST RUN');

		try {
			// Get all Threads integrations
			const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
				headers: {
					'cookie': process.env.INTERNEL_TOKEN,
					'Content-Type': 'application/json'
				}
			});

			const integrations = integrationsRes.data?.integrations || [];
			const threadsAccounts = integrations.filter(
				(i) => i.identifier === 'threads' && i.internalId
			);

			if (!threadsAccounts.length) {
				console.log('❌ No Threads accounts found.');
				return;
			}
			console.log('threadsAccounts', threadsAccounts)

			for (const account of threadsAccounts) {
				const accountId = account.internalId;
				const accessToken = account.token; // Use the token from the integration
				const organizationId = account.customer?.orgId;
				const customerId = account.customerId;

				try {
					// Get yesterday's date range
					const yesterday = subDays(new Date(), 1);
					const since = Math.floor(startOfDay(yesterday).getTime() / 1000);
					const until = Math.floor(endOfDay(yesterday).getTime() / 1000);

					// Get account info (followers, username, etc.)
					const accountInfoRes = await axios.get(
						`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
					);
					const username = accountInfoRes.data?.username || '';

					// Get insights metrics from the Threads API
					const insightsRes = await axios.get(
						`https://graph.threads.net/v1.0/${accountId}/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}&period=day&since=${since}&until=${until}`
					);

					// Process insights data
					let views = 0;
					let likes = 0;
					let replies = 0;
					let reposts = 0;
					let quotes = 0;

					insightsRes.data?.data?.forEach((metric: any) => {
						const value = metric.total_value?.value || metric.values?.[0]?.value || 0;
						switch (metric.name) {
							case 'views':
								views = value;
								break;
							case 'likes':
								likes = value;
								break;
							case 'replies':
								replies = value;
								break;
							case 'reposts':
								reposts = value;
								break;
							case 'quotes':
								quotes = value;
								break;
						}
					});

					// Calculate engagement and interactions
					const engagement = likes + replies + reposts + quotes;
					const interactions = engagement;
					const impressions = views;

					const month = format(yesterday, 'yyyy-MM');

					console.log(`📤 Inserting Threads insights for account ${accountId}`);

					await this._threadsInsightsRepository.model.threadsInsight.create({
						data: {
							businessId: accountId,
							organizationId,
							customerId,
							month,
							followers: 0, // Threads API doesn't provide followers in insights
							totalContent: 0, // Would need to fetch posts count separately
							engagement,
							interactions,
							impressions
						},
					});

					console.log(`✅ Inserted Threads insight for ${username || accountId}`);
				} catch (innerError) {
					const error = innerError as AxiosError;
					console.error(`⚠️ Failed to process ${account.name}: ${error.message}`);
					if (error.response) {
						console.error('Threads API error:', {
							status: error.response.status,
							data: error.response.data
						});
					}
				}
			}
		} catch (error) {
			console.error(`❌ Failed to fetch integrations or process Threads insights: ${error.message}`);
		}
	}
}