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

    // @Cron('0 0 * * *') // for midnight
	// async handleThreadsInsights() {
	// 	console.log('⏰ Threads Insights Cron job triggered');

	// 	try {
	// 		// Get all Threads integrations
	// 		const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
	// 			headers: {
	// 				'cookie': process.env.INTERNEL_TOKEN,
	// 				'Content-Type': 'application/json'
	// 			}
	// 		});

	// 		const integrations = integrationsRes.data?.integrations || [];
	// 		const threadsAccounts = integrations.filter(
	// 			(i) => i.identifier === 'threads' && i.internalId
	// 		);

	// 		if (!threadsAccounts.length) {
	// 			console.log('❌ No Threads accounts found.');
	// 			return;
	// 		}
	// 		console.log('threadsAccounts', threadsAccounts)

	// 		for (const account of threadsAccounts) {
	// 			const accountId = account.internalId;
	// 			const accessToken = process.env.THREADS_ACCESS_TOKEN
	// 			const organizationId = account.customer?.orgId;

	// 			console.log('Using Threads Access Token:', process.env.THREADS_ACCESS_TOKEN);

	// 			try {
	// 				// Get yesterday's date range
	// 				const yesterday = subDays(new Date(), 1);
	// 				const dayStart = format(startOfDay(yesterday), 'yyyy-MM-dd');
	// 				const dayEnd = format(endOfDay(yesterday), 'yyyy-MM-dd');

	// 				// Note: Threads API endpoints are hypothetical - may need adjustment
	// 				// 1. Get account info (followers)
	// 				const accountInfoRes = await axios.get(
	// 					`https://graph.facebook.com/v19.0/${accountId}?fields=followers_count&access_token=${accessToken}`
	// 				);
	// 				const followers = accountInfoRes.data?.followers_count || 0;

	// 				// 2. Get posts count
	// 				const postsRes = await axios.get(
	// 					`https://graph.facebook.com/v19.0/${accountId}/media?fields=id&since=${dayStart}&until=${dayEnd}&access_token=${accessToken}`
	// 				);
	// 				const posts = postsRes.data?.data?.length || 0;

	// 				// 3. Get engagement metrics (hypothetical endpoint)
	// 				let engagement = 0;
	// 				let interactions = 0;
	// 				let impressions = 0;

	// 				try {
	// 					const insightsRes = await axios.get(
	// 						`https://graph.facebook.com/v19.0/${accountId}/insights?metric=engagement,impressions&period=day&since=${dayStart}&until=${dayEnd}&access_token=${accessToken}`
	// 					);

	// 					// Process insights data
	// 					insightsRes.data?.data?.forEach(metric => {
	// 						if (metric.name === 'engagement') {
	// 							engagement = metric.values[0]?.value || 0;
	// 							interactions = metric.values[0]?.value || 0; // Adjust based on actual API
	// 						} else if (metric.name === 'impressions') {
	// 							impressions = metric.values[0]?.value || 0;
	// 						}
	// 					});
	// 				} catch (e) {
	// 					console.error(`⚠️ Failed to get insights for ${account.name}: ${e.message}`);
	// 				}

	// 				const month = new Date().toISOString().slice(0, 7);

	// 				console.log(`📤 Inserting Threads insights for account ${accountId}`);

	// 				await this._threadsInsightsRepository.model.threadsInsight.create({
	// 					data: {
	// 						accountId,
	// 						organizationId,
	// 						month,
	// 						followers,
	// 						posts,
	// 						engagement,
	// 						interactions,
	// 						impressions
	// 					},
	// 				});

	// 				console.log(`✅ Inserted Threads insight for ${account.name}`);
	// 			} catch (innerError) {
	// 				const error = innerError as AxiosError;
	// 				console.error(`⚠️ Failed to process ${account.name}: ${error.message}`);
	// 				if (error.response) {
	// 					console.error('Threads API error:', {
	// 						status: error.response.status,
	// 						data: error.response.data
	// 					});
	// 				}
	// 			}
	// 		}
	// 	} catch (error) {
	// 		console.error(`❌ Failed to fetch integrations or process Threads insights: ${error.message}`);
	// 	}
	// }
}