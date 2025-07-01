import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class FacebookInsightsTask {
	constructor(
		private _facebookInsightsRepository: PrismaRepository<'facebookInsight'>,
	) { }

    @Cron('0 0 * * *') // for midnight
	async handleFacebookInsights() {
		console.log('⏰ Facebook Insights Cron job triggered');

		try {
			// Step 1: Get all Facebook pages with their access tokens
			const pagesResponse = await axios.get(
				`https://graph.facebook.com/v19.0/me/accounts?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`
			);
			const pages = pagesResponse.data?.data || [];

			if (!pages.length) {
				console.log('❌ No Facebook pages found.');
				return;
			}

			// Step 2: Get integrations to map internalId
			const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
				headers: {
					'cookie': process.env.INTERNEL_TOKEN,
					'Content-Type': 'application/json'
				}
			});
			const integrations = integrationsRes.data?.integrations || [];

			for (const page of pages) {
				try {
					// Step 3: Match page.id with internalId
					const integration = integrations.find(
						(i) => i.identifier === 'facebook' && i.internalId === page.id
					);

					if (!integration) {
						console.log(`⚠️ No matching integration found for page ${page.name}`);
						continue;
					}

					const organizationId = integration.customer?.orgId;
					const internalId = integration.internalId;
					const pageAccessToken = page.access_token;

					const yesterday = subDays(new Date(), 1);
					const dayStart = Math.floor(startOfDay(yesterday).getTime() / 1000);
					const dayEnd = Math.floor(endOfDay(yesterday).getTime() / 1000);

					// 1. Page likes and followers
					const pageInfoRes = await axios.get(
						`https://graph.facebook.com/v19.0/${page.id}?fields=fan_count,followers_count&access_token=${pageAccessToken}`
					);
					const { fan_count: likes = 0, followers_count: followers = 0 } = pageInfoRes.data;

					// 2. Impressions
					let impressions = 0;
					try {
						const impressionsRes = await axios.get(
							`https://graph.facebook.com/v19.0/${page.id}/insights?metric=page_impressions&period=day&since=${dayStart}&until=${dayEnd}&access_token=${pageAccessToken}`
						);
						impressions = impressionsRes.data?.data?.[0]?.values?.reduce((sum, day) => sum + (day.value || 0), 0) || 0;
					} catch (e) {
						console.error(`⚠️ Impressions fetch failed for ${page.name}: ${e.message}`);
					}

					// 3. Page views
					let pageViews = 0;
					try {
						const pageViewsRes = await axios.get(
							`https://graph.facebook.com/v19.0/${page.id}/insights?metric=page_views_total&period=day&since=${dayStart}&until=${dayEnd}&access_token=${pageAccessToken}`
						);
						pageViews = pageViewsRes.data?.data?.[0]?.values?.reduce((sum, day) => sum + (day.value || 0), 0) || 0;
					} catch (e) {
						console.error(`⚠️ Page views fetch failed for ${page.name}: ${e.message}`);
					}

					// 4. Published posts count
					let totalContent = 0;
					try {
						const postsRes = await axios.get(
							`https://graph.facebook.com/v19.0/${page.id}/published_posts?fields=id&since=${dayStart}&until=${dayEnd}&access_token=${pageAccessToken}`
						);
						totalContent = postsRes.data?.data?.length || 0;
					} catch (e) {
						console.error(`⚠️ Posts fetch failed for ${page.name}: ${e.message}`);
					}

					const month = new Date().toISOString().slice(0, 7);

					// ✅ Step 5: Store insight with internalId
					await this._facebookInsightsRepository.model.facebookInsight.create({
						data: {
							businessId: page.id,
							//internalId, // ✅ Add internalId to your DB
							organizationId,
							month,
							likes,
							followers,
							impressions,
							pageViews,
							totalContent,
						},
					});

					console.log(`✅ Inserted Facebook insight for ${page.name} (internalId: ${internalId})`);
				} catch (innerError) {
					const error = innerError as AxiosError;
					console.error(`⚠️ Failed to process ${page.name}: ${error.message}`);
					if (error.response) {
						console.error('Facebook API error:', {
							status: error.response.status,
							data: error.response.data
						});
					}
				}
			}
		} catch (error) {
			console.error(`❌ Facebook cron job failed: ${error.message}`);
		}
	}
}
