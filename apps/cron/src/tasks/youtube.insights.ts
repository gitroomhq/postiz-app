import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class YoutubeInsightsTask {
	constructor(
		private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
		private _socialTokenRepo : PrismaRepository<'socialToken'> 
	) { }

  	@Cron('20 0 * * *') // Runs at 12:20 AM IST daily
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
			//console.log(youtubeAccounts)
			for (const account of youtubeAccounts) {
				const businessId = account.internalId; 
				const organizationId = account.customer?.orgId;

				const tokenEntry = await this._socialTokenRepo.model.socialToken.findFirst({
					where: {
						identifier  : 'youtube',
						businessId  : businessId,
						accessToken: { not: null }
					}
				});

				if (!tokenEntry?.accessToken) {
						console.log(`❌ No valid youtube access token found for ${businessId}`);
						return;
				}

				const accessToken = tokenEntry?.accessToken;  

				try {
					// Fetch YouTube channel statistics
					const statsRes = await axios.get(
						`https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true`,
						{
							headers: {
								Authorization: `Bearer ${accessToken}`,
							},
						}
					);

					const stats = statsRes.data?.items?.[0]?.statistics;
					if (!stats) {
						console.log(`❌ No statistics found for internalId: ${businessId}`);
						continue;
					}

					const month = new Date().toISOString().slice(0, 7);

					await this._youtubeInsightsRepository.model.youTubeInsight.create({
						data: {
							businessId,
							organizationId,
							customerId: account.customer?.id,// Add this line
							month,
							subscribers: parseInt(stats.subscriberCount || '0'),
							totalViews: parseInt(stats.viewCount || '0'),
							totalVideos: parseInt(stats.videoCount || '0'),
							totalLikes: 0, // To be updated if needed
							totalComments: parseInt(stats.commentCount || '0'),
						},
					});

					console.log(`✅ Inserted YouTube insight for ${businessId}`);
				} catch (innerError) {
					console.error(`⚠️ Failed to process ${account.name}: ${innerError.message}`);
				}
			}
		} catch (error) {
			console.error(`❌ Failed to fetch integrations or process insights: ${error.message}`);
		}
	}
}
