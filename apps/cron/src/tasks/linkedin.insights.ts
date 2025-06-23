// linkedin.insights.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class LinkedInInsightsTask {
	constructor(
		private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
	) { }

	@Cron('0 0 * * *') // Runs at midnight
	async handleLinkedInInsights() {
		console.log('⏰ LinkedIn Insights Cron job triggered');

		try {
			// Step 1: Get all LinkedIn integrations
			const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
				headers: {
					'cookie': process.env.INTERNEL_TOKEN,
					'Content-Type': 'application/json'
				}
			});

			const integrations = integrationsRes.data?.integrations || [];
			const linkedInIntegrations = integrations.filter(i => i.identifier === 'linkedin');

			if (!linkedInIntegrations.length) {
				console.log('❌ No LinkedIn integrations found.');
				return;
			}

			for (const integration of linkedInIntegrations) {
				try {
					const organizationId = integration.customer?.orgId;
					const accessToken = integration.token?.access_token;
					const pageId = integration.internalId;

					if (!accessToken || !pageId) {
						console.log(`⚠️ No access token or page ID for LinkedIn integration ${integration.id}`);
						continue;
					}

					// Get yesterday's date range
					const yesterday = subDays(new Date(), 1);
					const dayStart = startOfDay(yesterday).toISOString();
					const dayEnd = endOfDay(yesterday).toISOString();

					// 1. Get page followers data
					let followers = 0;
					let paidFollowers = 0;
					try {
						const followersRes = await axios.get(
							`https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${pageId}`,
							{
								headers: {
									'Authorization': `Bearer ${accessToken}`,
									'X-Restli-Protocol-Version': '2.0.0'
								}
							}
						);
						followers = followersRes.data?.elements?.[0]?.followerCounts?.organicFollowerCount || 0;
						paidFollowers = followersRes.data?.elements?.[0]?.followerCounts?.paidFollowerCount || 0;
					} catch (e) {
						console.error(`⚠️ Failed to get followers for page ${pageId}: ${e.message}`);
					}

					// 2. Get impressions and posts count
					let impressions = 0;
					let postsCount = 0;
					try {
						const postsRes = await axios.get(
							`https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aorganization%3A${pageId})&count=100&start=0`,
							{
								headers: {
									'Authorization': `Bearer ${accessToken}`,
									'X-Restli-Protocol-Version': '2.0.0'
								}
							}
						);

						postsCount = postsRes.data?.elements?.length || 0;

						// Get impressions for each post
						for (const post of postsRes.data?.elements || []) {
							try {
								const postId = post.id.split(':').pop();
								const statsRes = await axios.get(
									`https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${pageId}&shares=List(urn%3Ali%3Ashare%3A${postId})`,
									{
										headers: {
											'Authorization': `Bearer ${accessToken}`,
											'X-Restli-Protocol-Version': '2.0.0'
										}
									}
								);
								impressions += statsRes.data?.elements?.[0]?.totalShareStatistics?.impressionCount || 0;
							} catch (e) {
								console.error(`⚠️ Failed to get stats for post ${post.id}: ${e.message}`);
							}
						}
					} catch (e) {
						console.error(`⚠️ Failed to get posts for page ${pageId}: ${e.message}`);
					}

					const month = new Date().toISOString().slice(0, 7);

					console.log(`📤 Inserting LinkedIn insights for page ${pageId}, org ${organizationId}`);

					await this._linkedInInsightsRepository.model.linkedInInsight.create({
						data: {
							pageId,
							organizationId,
							month,
							followers,
							paidFollowers,
							impressions,
							postsCount
						},
					});

					console.log(`✅ Inserted LinkedIn insight for ${pageId} at ${new Date().toISOString()}`);
				} catch (innerError) {
					const error = innerError as AxiosError;
					console.error(`⚠️ Failed to process LinkedIn integration ${integration.id}: ${error.message}`);
					if (error.response) {
						console.error('LinkedIn API error:', {
							status: error.response.status,
							data: error.response.data
						});
					}
				}
			}
		} catch (error) {
			console.error(`❌ Failed to process LinkedIn insights: ${error.message}`);
		}
	}
}