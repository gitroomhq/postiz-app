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

	@Cron('0 0 * * *') // Runs at midnight
	//@Cron('* * * * *') // Runs every minute (for testing)
	async handleFacebookInsights() {
		console.log('⏰ Facebook Insights Cron job triggered');

		try {
			// Step 1: Get all Facebook pages with their access tokens
			const pagesResponse = await axios.get(
				`https://graph.facebook.com/v19.0/me/accounts?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`
			);

			const pages = pagesResponse.data.data;

			if (!pages.length) {
				console.log('❌ No Facebook pages found.');
				return;
			}

			// Step 2: Get our stored integrations to match with Facebook pages
			const integrationsRes = await axios.get(`${process.env.BACKEND_INTERNAL_URL}/integrations/list`, {
				headers: {
					'cookie': process.env.INTERNEL_TOKEN,
					'Content-Type': 'application/json'
				}
			});

			const integrations = integrationsRes.data?.integrations || [];

			for (const page of pages) {
				try {
					// Find matching integration
					const integration = integrations.find(
						(i) => i.identifier === 'facebook' && i.internalId === page.id
					);

					if (!integration) {
						console.log(`⚠️ No matching integration found for page ${page.name}`);
						continue;
					}

					const organizationId = integration.customer?.orgId;
					const pageAccessToken = page.access_token; // Use the page-specific token

					// Get yesterday's date range
					const yesterday = subDays(new Date(), 1);
					const dayStart = Math.floor(startOfDay(yesterday).getTime() / 1000);
					const dayEnd = Math.floor(endOfDay(yesterday).getTime() / 1000);

					// 1. Get basic page info (likes and followers)
					const pageInfoRes = await axios.get(
						`https://graph.facebook.com/v19.0/${page.id}?fields=fan_count,followers_count&access_token=${pageAccessToken}`
					);
					const { fan_count: likes = 0, followers_count: followers = 0 } = pageInfoRes.data;

					// 2. Get impressions
					let impressions = 0;
					try {
						const impressionsRes = await axios.get(
							`https://graph.facebook.com/v19.0/${page.id}/insights?metric=page_impressions&period=day&since=${dayStart}&until=${dayEnd}&access_token=${pageAccessToken}`
						);
						impressions = impressionsRes.data?.data?.[0]?.values?.reduce((sum, day) => sum + (day.value || 0), 0) || 0;
					} catch (e) {
						console.error(`⚠️ Failed to get impressions for ${page.name}: ${e.message}`);
					}

					// 3. Get page views
					let pageViews = 0;
					try {
						const pageViewsRes = await axios.get(
							`https://graph.facebook.com/v19.0/${page.id}/insights?metric=page_views_total&period=day&since=${dayStart}&until=${dayEnd}&access_token=${pageAccessToken}`
						);
						pageViews = pageViewsRes.data?.data?.[0]?.values?.reduce((sum, day) => sum + (day.value || 0), 0) || 0;
					} catch (e) {
						console.error(`⚠️ Failed to get page views for ${page.name}: ${e.message}`);
					}

					// 4. Get published posts count
					let totalContent = 0;
					try {
						const postsRes = await axios.get(
							`https://graph.facebook.com/v19.0/${page.id}/published_posts?fields=id&since=${dayStart}&until=${dayEnd}&access_token=${pageAccessToken}`
						);
						totalContent = postsRes.data?.data?.length || 0;
					} catch (e) {
						console.error(`⚠️ Failed to get posts for ${page.name}: ${e.message}`);
					}

					const month = new Date().toISOString().slice(0, 7);

					console.log(`📤 Inserting Facebook insights for page ${page.id}, org ${organizationId}`);

					await this._facebookInsightsRepository.model.facebookInsight.create({
						data: {
							pageId: page.id,
							organizationId,
							month,
							likes,
							followers,
							impressions,
							pageViews,
							totalContent
						},
					});

					console.log(`✅ Inserted Facebook insight for ${page.name} at ${new Date().toISOString()}`);
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
			console.error(`❌ Failed to fetch Facebook pages or process insights: ${error.message}`);
		}
	}
}