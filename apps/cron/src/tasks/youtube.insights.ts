// youtube.insights.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class YoutubeInsightsTask {
	constructor(
		private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
	) { }

	//@Cron('* * * * *') // Run every minute
	@Cron('0 0 * * *') // Run daily at midnight
	async handleYoutubeInsights() {
		console.log('⏰ YouTube insights cron job triggered');

		try {
			const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
				headers: {
					'cookie': process.env.INTERNEL_TOKEN,
					'Content-Type': 'application/json'
				}
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
				//const accessToken = account.accessToken; // Must be stored from OAuth flow
				const accessToken = process.env.YOUTUBE_ACCESS_TOKEN
				const organizationId = account.customer?.orgId;

				try {
					// Fetch channel ID dynamically using access token
					const channelRes = await axios.get(
						`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`,
						{
							headers: {
								Authorization: `Bearer ${accessToken}`,
							},
						}
					);

					const channelId = channelRes.data?.items?.[0]?.id;

					if (!channelId) {
						console.log(`❌ Channel ID not found for account ${account.name}`);
						continue;
					}

					console.log("✅ Fetched channelId:", channelId);

					// Fetch channel statistics
					const statsRes = await axios.get(
						`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&access_token=${accessToken}`
					);

					const stats = statsRes.data?.items?.[0]?.statistics;
					if (!stats) {
						console.log(`❌ No statistics found for channel ${channelId}`);
						continue;
					}

					const month = new Date().toISOString().slice(0, 7);

					await this._youtubeInsightsRepository.model.youTubeInsight.create({
						data: {
							channelId,
							organizationId,
							month,
							subscribers: parseInt(stats.subscriberCount || '0'),
							totalViews: parseInt(stats.viewCount || '0'),
							totalVideos: parseInt(stats.videoCount || '0'),
							totalLikes: 0, // You can update this with per-video fetch
							totalComments: parseInt(stats.commentCount || '0'),
						},
					});

					console.log(`✅ Inserted YouTube insight for ${channelId}`);
				} catch (innerError) {
					console.error(`⚠️ Failed to process account ${account.name}: ${innerError.message}`);
				}
			}
		} catch (error) {
			console.error(`❌ Failed to fetch integrations or process YouTube insights: ${error.message}`);
		}
	}
}
