import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class YoutubeInsightsTask {
	constructor(
		private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
	) { }

	//@Cron('* * * * *') // for every minute

	// Run every day at midnight
	@Cron('0 0 * * *')
	async handleYoutubeInsights() {
		console.log('⏰ YouTube insights cron job triggered');

		try {
			const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
				headers: {
					'cookie': process.env.INTERNEL_TOKEN,
					'Content-Type': 'application/json',
				},
			});

			const integrations = integrationsRes.data?.integrations || [];
			const youtubeAccounts = integrations.filter(
				(i) => i.identifier === 'youtube' && i.internalId
			);

			if (!youtubeAccounts.length) {
				console.log('❌ No YouTube accounts found.');
				return;
			}

			for (const account of youtubeAccounts) {
				//	const accessToken = account.accessToken;
				const accessToken = process.env.YOUTUBE_ACCESS_TOKEN
				const internalId = account.internalId; // Your platform’s internal account ID
				const organizationId = account.customer?.orgId;

				try {
					// 1. Fetch channel ID using access token
					const channelRes = await axios.get(
						`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`,
						{
							headers: {
								Authorization: `Bearer ${accessToken}`,
							},
						}
					);

					const businessId = channelRes.data?.items?.[0]?.id;

					if (!businessId) {
						console.log(`❌ Channel ID not found for internalId: ${internalId}`);
						continue;
					}

					// 2. Fetch channel statistics
					const statsRes = await axios.get(
						`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${businessId}`,
						{
							headers: {
								Authorization: `Bearer ${accessToken}`,
							},
						}
					);

					const stats = statsRes.data?.items?.[0]?.statistics;
					if (!stats) {
						console.log(`❌ No statistics found for channel ${businessId}`);
						continue;
					}

					const month = new Date().toISOString().slice(0, 7);

					// 3. Store data in DB
					await this._youtubeInsightsRepository.model.youTubeInsight.create({
						data: {
							businessId,
							organizationId,
							month,
							subscribers: parseInt(stats.subscriberCount || '0'),
							totalViews: parseInt(stats.viewCount || '0'),
							totalVideos: parseInt(stats.videoCount || '0'),
							totalLikes: 0, // To be updated via per-video fetch if needed
							totalComments: parseInt(stats.commentCount || '0'),
						},
					});

					console.log(`✅ Inserted YouTube insight for ${businessId} (internalId: ${internalId})`);
				} catch (innerError) {
					console.error(`⚠️ Failed to process internalId ${internalId}: ${innerError.message}`);
				}
			}
		} catch (error) {
			console.error(`❌ Failed to fetch integrations or process YouTube insights: ${error.message}`);
		}
	}
}
