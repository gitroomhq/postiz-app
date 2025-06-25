import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class LinkedInInsightsTask {
	constructor(
		private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
	) { }

	@Cron('* * * * *') // For testing: runs every minute
	async handleLinkedInInsights() {
		console.log('⏰ LinkedIn Insights Cron job triggered');

		try {
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
				let success = true;
				const organizationId = integration.customer?.orgId;
				const internalId = integration.internalId;
				//const accessToken = integration.token?.access_token;
				const accessToken = 'AQXRJ_5tEAq_Wmeg_PkqH9W4aty2X2is-yh7wCrwdbRFYpLUrYHqHQADO-PGFz0n4Ga5kDGkV0-bHyNOI-0WLvtJyDbnpWF1vfWhDFTbKdZXnY96s-samGxOWe06Yd_Rm92B1Lesv009Yw481j9xpXelRbORF-8maZsDBOHC6eSmWuMlN5wCQnNXCuH8xsjsE0wNwxNrxrOSX6LD9rpq1laRAE_mT3LDwRTw_EncDPhbg0nF4La76FJF7eSU4qrxgsJLu2szTWxw85JMbM0yrjXq6Gn0_7T23DFX3O9LdwyjWy12OmTH7SaY_4yCvcHYOnS4DzewxNCKwsInl6iW3NcmOIG_8w'

				if (!accessToken || !internalId) {
					console.log(`⚠️ Missing token or internalId for integration ${integration.id}`);
					continue;

				}

				console.log('internalId', internalId)
				// Use internalId as the LinkedIn businessId (LinkedIn org ID)
				const businessId = internalId;

				// Verify token is valid
				try {
					await axios.get(`https://api.linkedin.com/v2/me`, {
						headers: {
							'Authorization': `Bearer ${accessToken}`,
							'X-Restli-Protocol-Version': '2.0.0'
						}
					});
				} catch (e) {
					console.error(`❌ LinkedIn token invalid for businessId ${businessId}. Needs reauthentication.`);
					continue;
				}

				const yesterday = subDays(new Date(), 1);
				const dayStart = startOfDay(yesterday).toISOString();
				const dayEnd = endOfDay(yesterday).toISOString();

				let followers = 0;
				let paidFollowers = 0;
				try {
					const followersRes = await axios.get(
						`https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${businessId}`,
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
					console.error(`⚠️ Failed to fetch followers for ${businessId}: ${e.message}`);
					success = false;
				}

				let impressions = 0;
				let postsCount = 0;
				try {
					const postsRes = await axios.get(
						`https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aorganization%3A${businessId})&count=100&start=0`,
						{
							headers: {
								'Authorization': `Bearer ${accessToken}`,
								'X-Restli-Protocol-Version': '2.0.0'
							}
						}
					);
					postsCount = postsRes.data?.elements?.length || 0;

					for (const post of postsRes.data?.elements || []) {
						const postId = post.id.split(':').pop();
						try {
							const statsRes = await axios.get(
								`https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${businessId}&shares=List(urn%3Ali%3Ashare%3A${postId})`,
								{
									headers: {
										'Authorization': `Bearer ${accessToken}`,
										'X-Restli-Protocol-Version': '2.0.0'
									}
								}
							);
							impressions += statsRes.data?.elements?.[0]?.totalShareStatistics?.impressionCount || 0;
						} catch (e) {
							console.error(`⚠️ Failed to fetch stats for post ${postId}: ${e.message}`);
							success = false;
						}
					}
				} catch (e) {
					console.error(`⚠️ Failed to fetch posts for ${businessId}: ${e.message}`);
					success = false;
				}

				if (success) {
					const month = new Date().toISOString().slice(0, 7);
					try {
						await this._linkedInInsightsRepository.model.linkedInInsight.create({
							data: {
								businessId,
								//internalId,
								organizationId,
								month,
								followers,
								paidFollowers,
								impressions,
								postsCount
							},
						});
						console.log(`✅ Saved LinkedIn insight for businessId ${businessId}`);
					} catch (e) {
						console.error(`❌ Failed to insert DB record for ${businessId}: ${e.message}`);
					}
				} else {
					console.log(`⚠️ Skipped DB insert for ${businessId} due to previous failures`);
				}
			}
		} catch (error) {
			console.error(`❌ Critical LinkedIn cron failure: ${error.message}`);
		}
	}
}
