
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { startOfMonth, endOfMonth, format } from 'date-fns';

@Injectable()
export class MonthlyReportService {
	constructor(
		private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
		private _xInsightsRepository: PrismaRepository<'xInsight'>,
		private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
		private _facebookInsightsRepository: PrismaRepository<'facebookInsight'>,
		private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
		private _gbpInsightsRepository: PrismaRepository<'gbpInsight'>,
		private _websitePerformanceRepo: PrismaRepository<'websitePerformance'>,
		private _websiteLocationRepo: PrismaRepository<'websiteLocation'>,
		private _prisma: PrismaRepository<'customer'>,
	) { }

	private validateInputs(customerId: string, month: number, year: number) {
		if (!customerId || typeof customerId !== 'string') {
			throw new Error('Invalid customerId');
		}
		if (month < 1 || month > 12) {
			throw new Error(`Invalid month: ${month}. Must be 1-12`);
		}
		if (year < 2000 || year > 2100) {
			throw new Error(`Invalid year: ${year}. Must be 2000-2100`);
		}
	}

	private getMonthString(month: number, year: number) {
		this.validateInputs('dummy', month, year);
		return `${year}-${month.toString().padStart(2, '0')}`;
	}

	private getMonthDateRange(month: number, year: number) {
		const date = new Date(year, month - 1, 1);
		return {
			startDate: startOfMonth(date),
			endDate: endOfMonth(date),
		};
	}

	private async getDataForMonths(
		repository: any,
		customerId: string,
		month: number,
		year: number,
		fields: string[],
	) {
		const allMonthsData = [];

		for (let i = 2; i >= 0; i--) {
			const currentMonth = new Date(year, month - 1 - i, 1);
			const monthNum = currentMonth.getMonth() + 1;
			const yearNum = currentMonth.getFullYear();
			const { startDate, endDate } = this.getMonthDateRange(monthNum, yearNum);

			const insights = await repository.findMany({
				where: {
					customerId,
					createdAt: { gte: startDate, lte: endDate },
				},
			});

			if (insights.length > 0) {
				const summary: any = { createdAt: new Date(yearNum, monthNum - 1, 15) };
				fields.forEach(field => {
					summary[field] = insights.reduce((sum, entry) => sum + (entry[field] || 0), 0);
				});
				allMonthsData.push(summary);
			} else {
				const emptyData: any = { createdAt: new Date(yearNum, monthNum - 1, 15) };
				fields.forEach(field => (emptyData[field] = 0));
				allMonthsData.push(emptyData);
			}
		}

		return allMonthsData;
	}


	private async getDailyDataForMonth(
		repository: any,
		customerId: string,
		month: number,
		year: number,
		fields: string[],
	) {
		const { startDate, endDate } = this.getMonthDateRange(month, year);

		const dailyData = await repository.findMany({
			where: {
				customerId,
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			orderBy: { createdAt: 'asc' },
		});

		return dailyData.map(data => {
			const result: any = { date: data.createdAt };
			fields.forEach(field => (result[field] = data[field] || 0));
			return result;
		});
	}

	// Instagram methods remain unchanged
	async getInstagramCommunityReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the month
			const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) return null;

			// For table data, still use monthly aggregation
			const monthlyData = await this.getDataForMonths(
				this._instagramInsightsRepository.model.instagramInsight,
				customerId,
				month,
				year,
				['followers', 'following', 'totalContent'],
			);

			return {
				table: this.buildCommunityTable(monthlyData, 'Instagram'),
				chart: insights.map(i => ({
					date: i.createdAt,
					followers: i.followers || 0,
					following: i.following || 0,
					totalContent: i.totalContent || 0,
				})),
			};
		} catch (error) {
			console.error('Instagram Community Error:', error);
			return null;
		}
	}

	async getInstagramOverviewReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get DAILY data for the requested month
			const dailyData = await this._instagramInsightsRepository.model.instagramInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
				select: {
					createdAt: true,
					impressions: true,
					avgReachPerDay: true,
					totalContent: true  // ✅ Add this line

				},
			});

			// Get monthly data for comparison table
			const monthlyData = await this.getDataForMonths(
				this._instagramInsightsRepository.model.instagramInsight,
				customerId,
				month,
				year,
				['impressions', 'avgReachPerDay', 'totalContent'],
			);

			return {
				table: this.buildOverviewTable(monthlyData, 'Instagram'),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					impressions: item.impressions || 0,
					avgReachPerDay: item.avgReachPerDay || 0,
					totalContent: item.totalContent || 0  // ✅ Add this

				})),
			};
		} catch (error) {
			console.error('Instagram Overview Error:', error);
			return null;
		}
	}

	// Updated Facebook methods with daily charts
	async getFacebookCommunityReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._facebookInsightsRepository.model.facebookInsight,
				customerId,
				month,
				year,
				['likes', 'followers', 'totalContent'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._facebookInsightsRepository.model.facebookInsight,
				customerId,
				month,
				year,
				['likes', 'followers', 'totalContent']
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildCommunityTable(monthlyData, 'Facebook'),
				chart: dailyData,
			};
		} catch (error) {
			console.error('Facebook Community Error:', error);
			return null;
		}
	}

	async getFacebookOverviewReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._facebookInsightsRepository.model.facebookInsight,
				customerId,
				month,
				year,
				['impressions', 'pageViews', 'totalContent'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._facebookInsightsRepository.model.facebookInsight,
				customerId,
				month,
				year,
				['impressions', 'pageViews', 'totalContent'],
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildOverviewTable(monthlyData, 'Facebook'),
				chart: dailyData,
			};
		} catch (error) {
			console.error('Facebook Overview Error:', error);
			return null;
		}
	}

	// Updated YouTube methods with daily charts
	async getYoutubeOverviewReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table - add likes and comments
			const monthlyData = await this.getDataForMonths(
				this._youtubeInsightsRepository.model.youTubeInsight,
				customerId,
				month,
				year,
				['subscribers', 'totalViews', 'totalVideos', 'totalLikes', 'totalComments'],
			);

			// Daily data for chart - add likes and comments
			const dailyData = await this.getDailyDataForMonth(
				this._youtubeInsightsRepository.model.youTubeInsight,
				customerId,
				month,
				year,
				['subscribers', 'totalViews', 'totalVideos', 'totalLikes', 'totalComments'],
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildOverviewTable(monthlyData, 'YouTube'),
				chart: dailyData,
			};
		} catch (error) {
			console.error('YouTube Overview Error:', error);
			return null;
		}
	}

	async getYoutubeCommunityReport(customerId: string, month: number, year: number) {
		try {
			const monthlyData = await this.getDataForMonths(
				this._youtubeInsightsRepository.model.youTubeInsight,
				customerId,
				month,
				year,
				['subscribers', 'totalViews', 'totalVideos', 'totalLikes', 'totalComments']
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildYoutubeCommunityTable(monthlyData),
				chart: await this.getDailyDataForMonth(
					this._youtubeInsightsRepository.model.youTubeInsight,
					customerId,
					month,
					year,
					['subscribers', 'totalViews', 'totalVideos', 'totalLikes', 'totalComments']
				)
			};
		} catch (error) {
			console.error('YouTube Community Error:', error);
			return null;
		}
	}

	private buildYoutubeCommunityTable(insights: any[]) {
		const months = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const first = values[0];
			const last = values[values.length - 1];
			if (first === 0) return last === 0 ? '0%' : 'N/A';
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};

		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		const subscribers = insights.map(i => parseInt(i.subscribers) || 0);
		const totalViews = insights.map(i => parseInt(i.totalViews) || 0);
		const totalVideos = insights.map(i => parseInt(i.totalVideos) || 0);
		const totalLikes = insights.map(i => parseInt(i.totalLikes) || 0);
		const totalComments = insights.map(i => parseInt(i.totalComments) || 0);

		rows.push(
			['Subscribers', ...subscribers.map(String), calculateChange(subscribers)],
			['Total Views', ...totalViews.map(String), calculateChange(totalViews)],
			['Total Videos', ...totalVideos.map(String), calculateChange(totalVideos)],
			['Total likes', ...totalLikes.map(String), calculateChange(totalLikes)],
			['Total Comments', ...totalComments.map(String), calculateChange(totalComments)]
		);

		return {
			Data: headers,
			Rows: rows,
			Growth: `Subscribers growth: ${subscribers[subscribers.length - 1] - subscribers[0]}`
		};
	}

	// Updated LinkedIn methods with daily charts
	async getLinkedInCommunityReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._linkedInInsightsRepository.model.linkedInInsight,
				customerId,
				month,
				year,
				['followers', 'paidFollowers', 'postsCount', 'impressions'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._linkedInInsightsRepository.model.linkedInInsight,
				customerId,
				month,
				year,
				['followers', 'paidFollowers', 'postsCount', 'impressions'],
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildCommunityTable(monthlyData, 'LinkedIn'),
				chart: dailyData,
			};
		} catch (error) {
			console.error('LinkedIn Community Error:', error);
			return null;
		}
	}


	async getLinkedInOverviewReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._linkedInInsightsRepository.model.linkedInInsight,
				customerId,
				month,
				year,
				['impressions', 'postsCount', 'totalContent'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._linkedInInsightsRepository.model.linkedInInsight,
				customerId,
				month,
				year,
				['impressions'],
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildOverviewTable(monthlyData, 'LinkedIn'),
				chart: dailyData,
			};
		} catch (error) {
			console.error('LinkedIn Overview Error:', error);
			return null;
		}
	}

	// Updated X (Twitter) methods with daily charts
	async getXCommunityReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._xInsightsRepository.model.xInsight,
				customerId,
				month,
				year,
				['followers', 'following', 'totalContent'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._xInsightsRepository.model.xInsight,
				customerId,
				month,
				year,
				['followers', 'following', 'totalContent'],
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildCommunityTable(monthlyData, 'X'),
				chart: dailyData,
			};
		} catch (error) {
			console.error('X Community Error:', error);
			return null;
		}
	}

	async getXOverviewReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._xInsightsRepository.model.xInsight,
				customerId,
				month,
				year,
				['impressions', 'engagement', 'interactions'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._xInsightsRepository.model.xInsight,
				customerId,
				month,
				year,
				['impressions', 'engagement', 'interactions'],
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildOverviewTable(monthlyData, 'X'),
				chart: dailyData,
			};
		} catch (error) {
			console.error('X Overview Error:', error);
			return null;
		}
	}

	// The rest of the methods (buildCommunityTable, buildOverviewTable, etc.) remain unchanged
	private buildCommunityTable(insights: any[], platform: string) {
		// Get month abbreviations (JAN, FEB, MAR)
		const months = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		// Calculate percentage change
		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const first = values[0];
			const last = values[values.length - 1];
			if (first === 0) return last === 0 ? '0%' : 'N/A';
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};

		// Prepare table data
		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		// Common metrics
		const totalContents = insights.map(i => parseInt(i.totalContent) || 0);
		rows.push([
			'Total Content',
			...totalContents.map(String),
			calculateChange(totalContents),
		]);

		// Platform-specific metrics
		if (platform === 'Instagram') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const following = insights.map(i => parseInt(i.following) || 0);
			rows.push(
				['Followers', ...followers.map(String), calculateChange(followers)],
				['Following', ...following.map(String), calculateChange(following)],
			);
		} else if (platform === 'Facebook') {
			const likes = insights.map(i => parseInt(i.likes) || 0);
			const followers = insights.map(i => parseInt(i.followers) || 0);
			rows.push(
				['Likes', ...likes.map(String), calculateChange(likes)],
				['Followers', ...followers.map(String), calculateChange(followers)],
			);
		} else if (platform === 'LinkedIn') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const paidFollowers = insights.map(i => parseInt(i.paidFollowers) || 0);
			const impressions = insights.map(i => parseInt(i.impressions) || 0);
			const postsCount = insights.map(i => parseInt(i.postsCount) || 0);
			rows.push(
				['Followers', ...followers.map(String), calculateChange(followers)],
				['Paid Followers', ...paidFollowers.map(String), calculateChange(paidFollowers)],
				['Impressions', ...impressions.map(String), calculateChange(impressions)],
				['Posts', ...postsCount.map(String), calculateChange(postsCount)],
			);
		} else if (platform === 'X') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const following = insights.map(i => parseInt(i.following) || 0);
			//const totalContent = insights.map(i => parseInt(i.totalContent) || 0);
			rows.push(
				['Followers', ...followers.map(String), calculateChange(followers)],
				['Following', ...following.map(String), calculateChange(following)],
				//['Total Content', ...totalContent.map(String), calculateChange(totalContent)],
			);
		}


		return {
			Data: headers,
			Rows: rows,
			Growth: this.calculateGrowthText(insights[0], insights[insights.length - 1], platform),
		};
	}

	private buildOverviewTable(insights: any[], platform: string) {
		// Get month abbreviations (JAN, FEB, MAR)
		const monthAbbreviations = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		// Calculate percentage change
		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const first = values[0];
			const last = values[values.length - 1];
			if (first === 0) return last === 0 ? '0%' : 'N/A';
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};

		// Prepare table data
		const headers = ['Data', ...monthAbbreviations, 'Change %'];
		const rows = [];

		// Add Total Content row
		const totalContents = insights.map(i => parseInt(i.totalContent) || 0);
		rows.push([
			'Total Content',
			...totalContents.map(String),
			calculateChange(totalContents),
		]);

		// Platform-specific metrics
		switch (platform) {
			case 'Instagram':
				const impressions = insights.map(i => parseInt(i.impressions) || 0);
				const reach = insights.map(i => parseInt(i.avgReachPerDay) || 0);
				rows.push(
					['Impressions', ...impressions.map(String), calculateChange(impressions)],
					['Avg Reach/Day', ...reach.map(String), calculateChange(reach)],
				);
				break;

			case 'Facebook':
				const fbImpressions = insights.map(i => parseInt(i.impressions) || 0);
				const pageViews = insights.map(i => parseInt(i.pageViews) || 0);
				rows.push(
					['Impressions', ...fbImpressions.map(String), calculateChange(fbImpressions)],
					['Page Views', ...pageViews.map(String), calculateChange(pageViews)],
				);
				break;

			case 'YouTube':
				const subscribers = insights.map(i => parseInt(i.subscribers) || 0);
				const views = insights.map(i => parseInt(i.totalViews) || 0);
				const videos = insights.map(i => parseInt(i.totalVideos) || 0);
				const likes = insights.map(i => parseInt(i.likes) || 0);
				const comments = insights.map(i => parseInt(i.comments) || 0);
				rows.push(
					['Total Videos', ...videos.map(String), calculateChange(videos)],
					['Likes', ...likes.map(String), calculateChange(likes)],
					['Comments', ...comments.map(String), calculateChange(comments)]
				);
				break;

			case 'LinkedIn':
				const liImpressions = insights.map(i => parseInt(i.impressions) || 0);
				const posts = insights.map(i => parseInt(i.postsCount) || 0);
				rows.push(
					['Impressions', ...liImpressions.map(String), calculateChange(liImpressions)],
					['Posts', ...posts.map(String), calculateChange(posts)],
				);
				break;

			case 'X':
				const xImpressions = insights.map(i => parseInt(i.impressions) || 0);
				const engagement = insights.map(i => parseFloat(i.engagement) || 0);
				const interactions = insights.map(i => parseInt(i.interactions) || 0); // 👈 New line added
				rows.push(
					['Impressions', ...xImpressions.map(String), calculateChange(xImpressions)],
					['Engagement', ...engagement.map(String), calculateChange(engagement)],
					['Interactions', ...interactions.map(String), calculateChange(interactions)] // 👈 New row added

				);
				break;
		}

		return {
			Data: headers,
			Rows: rows,
		};
	}

	private calculateGrowthText(firstRecord: any, lastRecord: any, platform: string): string {
		if (!firstRecord || !lastRecord) return 'Insufficient data';

		let field = 'followers';
		if (platform === 'Facebook') field = 'likes';

		const change = (lastRecord[field] || 0) - (firstRecord[field] || 0);
		const changeText = `${change >= 0 ? '+' : ''}${change}`;

		if (platform === 'Facebook') return `${changeText} New Likes`;
		return `${changeText} New Followers`;
	}

	// Add these methods to the MonthlyReportService class in monthly-report.service.ts

	// GBP Methods
	async getGBPPerformanceReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._gbpInsightsRepository.model.gbpInsight,
				customerId,
				month,
				year,
				['impressionsMaps', 'impressionsSearch', 'websiteClicks', 'phoneClicks', 'directionRequests']
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._gbpInsightsRepository.model.gbpInsight,
				customerId,
				month,
				year,
				['impressionsMaps', 'impressionsSearch', 'websiteClicks', 'phoneClicks', 'directionRequests']
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildGBPPerformanceTable(monthlyData),
				chart: dailyData.map(item => ({
					date: item.date,
					maps: item.impressionsMaps || 0,
					search: item.impressionsSearch || 0,
					totalImpressions: (item.impressionsMaps || 0) + (item.impressionsSearch || 0)
				}))
			};
		} catch (error) {
			console.error('GBP Performance Error:', error);
			return null;
		}
	}

	async getGBPEngagementReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._gbpInsightsRepository.model.gbpInsight,
				customerId,
				month,
				year,
				['websiteClicks', 'phoneClicks', 'directionRequests']
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._gbpInsightsRepository.model.gbpInsight,
				customerId,
				month,
				year,
				['websiteClicks', 'phoneClicks', 'directionRequests']
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildGBPEngagementTable(monthlyData),
				chart: dailyData.map(item => ({
					date: item.date,
					website: item.websiteClicks || 0,
					phone: item.phoneClicks || 0,
					directions: item.directionRequests || 0,
					totalEngagement: (item.websiteClicks || 0) + (item.phoneClicks || 0) + (item.directionRequests || 0)
				}))
			};
		} catch (error) {
			console.error('GBP Engagement Error:', error);
			return null;
		}
	}

	async getGBPReviewsReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._gbpInsightsRepository.model.gbpInsight,
				customerId,
				month,
				year,
				['avgRating', 'totalReviews']
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._gbpInsightsRepository.model.gbpInsight,
				customerId,
				month,
				year,
				['avgRating', 'totalReviews']
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildGBPReviewsTable(monthlyData),
				chart: dailyData.map(item => ({
					date: item.date,
					rating: item.avgRating || 0,
					reviews: item.totalReviews || 0
				}))
			};
		} catch (error) {
			console.error('GBP Reviews Error:', error);
			return null;
		}
	}

	private buildGBPPerformanceTable(insights: any[]) {
		const months = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const first = values[0];
			const last = values[values.length - 1];
			if (first === 0) return last === 0 ? '0%' : 'N/A';
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};

		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		const mapsImpressions = insights.map(i => parseInt(i.impressionsMaps) || 0);
		const searchImpressions = insights.map(i => parseInt(i.impressionsSearch) || 0);
		const totalImpressions = insights.map((_, i) => mapsImpressions[i] + searchImpressions[i]);

		rows.push(
			['Google maps', ...mapsImpressions.map(String), calculateChange(mapsImpressions)],
			['Google search', ...searchImpressions.map(String), calculateChange(searchImpressions)],
			['Total', ...totalImpressions.map(String), calculateChange(totalImpressions)]
		);

		return {
			Data: headers,
			Rows: rows
		};
	}

	private buildGBPEngagementTable(insights: any[]) {
		const months = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const first = values[0];
			const last = values[values.length - 1];
			if (first === 0) return last === 0 ? '0%' : 'N/A';
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};

		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		const websiteClicks = insights.map(i => parseInt(i.websiteClicks) || 0);
		const phoneClicks = insights.map(i => parseInt(i.phoneClicks) || 0);
		const directions = insights.map(i => parseInt(i.directionRequests) || 0);
		const totalEngagement = insights.map((_, i) => websiteClicks[i] + phoneClicks[i] + directions[i]);

		rows.push(
			['Website', ...websiteClicks.map(String), calculateChange(websiteClicks)],
			['Phone', ...phoneClicks.map(String), calculateChange(phoneClicks)],
			['Directions', ...directions.map(String), calculateChange(directions)],
			['Total', ...totalEngagement.map(String), calculateChange(totalEngagement)]
		);

		return {
			Data: headers,
			Rows: rows
		};
	}

	private buildGBPReviewsTable(insights: any[]) {
		const months = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const first = values[0];
			const last = values[values.length - 1];
			if (first === 0) return last === 0 ? '0%' : 'N/A';
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};

		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		const ratings = insights.map(i => parseFloat(i.avgRating) || 0);
		const reviews = insights.map(i => parseInt(i.totalReviews) || 0);

		rows.push(
			['Star Rating', ...ratings.map(r => r.toFixed(2)), calculateChange(ratings)],
			['Total Reviews', ...reviews.map(String), calculateChange(reviews)]
		);

		return {
			Data: headers,
			Rows: rows
		};
	}

	// Website Methods
	async getWebsitePerformanceReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._websitePerformanceRepo.model.websitePerformance,
				customerId,
				month,
				year,
				['pageViews', 'visits', 'visitors']
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._websitePerformanceRepo.model.websitePerformance,
				customerId,
				month,
				year,
				['pageViews', 'visits', 'visitors']
			);

			if (!monthlyData.length) return null;

			return {
				table: this.buildWebsitePerformanceTable(monthlyData),
				chart: dailyData.map(item => ({
					date: item.date,
					pageViews: item.pageViews || 0,
					visits: item.visits || 0,
					visitors: item.visitors || 0
				}))
			};
		} catch (error) {
			console.error('Website Performance Error:', error);
			return null;
		}
	}

	async getWebsiteLocationsReport(customerId: string, selectedMonth: number, selectedYear: number) {
		try {
			// 1. Build past 3 months
			const targetDates = [];
			for (let i = 2; i >= 0; i--) {
				const date = new Date(selectedYear, selectedMonth - 1, 1); // JS month is 0-based
				date.setMonth(date.getMonth() - i);
				targetDates.push({
					month: date.getMonth() + 1,
					year: date.getFullYear(),
					label: format(date, 'MMM')
				});
			}

			const dataByMonth: Record<string, any[]> = {};

			// 2. Fetch data per month
			for (const { month, year, label } of targetDates) {
				const { startDate, endDate } = this.getMonthDateRange(month, year);
				const locations = await this._websiteLocationRepo.model.websiteLocation.findMany({
					where: {
						customerId,
						createdAt: { gte: startDate, lte: endDate },
						rank: { lte: 10 }
					},
					orderBy: [
						{ rank: 'asc' },
						{ visitors: 'desc' }
					]
				});
				dataByMonth[label] = locations;
			}

			// 3. Combine data country-wise
			const countryMap = new Map<string, number[]>();
			const labels = targetDates.map(d => d.label); // [Mar, Apr, May]

			labels.forEach((month, i) => {
				const locations = dataByMonth[month] || [];
				locations.forEach(({ country, visitors }) => {
					if (!countryMap.has(country)) {
						countryMap.set(country, Array(labels.length).fill(0));
					}
					countryMap.get(country)![i] += visitors || 0;
				});
			});

			// 4. Sort by latest month (May) and pick top 5
			const sorted = Array.from(countryMap.entries())
				.sort((a, b) => (b[1][2] || 0) - (a[1][2] || 0)) // May index = 2
				.slice(0, 5);

			const calculateChange = (arr: number[]) => {
				const prev = arr[1] || 0; // April
				const curr = arr[2] || 0; // May
				if (prev === 0) return curr === 0 ? '0%' : '-100.00%';
				const change = ((curr - prev) / prev) * 100;
				return `${change.toFixed(2)}%`;
			};

			const rows = sorted.map(([country, visitors]) => [
				country,
				...visitors.map(String),
				calculateChange(visitors)
			]);

			// 5. Chart data for May
			const totalMay = sorted.reduce((sum, [, v]) => sum + (v[2] || 0), 0);
			const chart = sorted.map(([country, v]) => ({
				country,
				visitors: v[2] || 0,
				percent: totalMay ? ((v[2] || 0) / totalMay) * 100 : 0
			}));

			return {
				table: {
					Data: ['Country', ...labels, 'Change %'],
					Rows: rows
				},
				chart
			};
		} catch (error) {
			console.error('Website Location Report Error:', error);
			return null;
		}
	}

	private buildWebsitePerformanceTable(insights: any[]) {
		const months = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const first = values[0];
			const last = values[values.length - 1];
			if (first === 0) return last === 0 ? '0%' : 'N/A';
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};

		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		const pageViews = insights.map(i => parseInt(i.pageViews) || 0);
		const visits = insights.map(i => parseInt(i.visits) || 0);
		const visitors = insights.map(i => parseInt(i.visitors) || 0);

		rows.push(
			['Page Views', ...pageViews.map(String), calculateChange(pageViews)],
			['Visits', ...visits.map(String), calculateChange(visits)],
			['Visitors', ...visitors.map(String), calculateChange(visitors)]
		);

		return {
			Data: headers,
			Rows: rows
		};
	}
	//hospital

	async getHospitalTable(customerId: string, month: number, year: number): Promise<any> {
		console.log('getHospitalTable called for hospital=true - creating 2 empty pages'); // Debug log
		
		// Return empty table structure for 2 empty pages
		return {
			Data: [],
			Rows: []
		};
	}

	private kFormatter(num: number): string {
		if (!num) return '0';
		return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
	}

	private parseNumber(value: string | number): number {
		if (typeof value === 'number') return value;
		const parsed = parseFloat(value);
		return isNaN(parsed) ? 0 : parsed;
	}

	async getCustomerInfo(customerId: string): Promise<{ name: string; brandLogo: string | null }> {
		const customer = await this._prisma.model.customer.findUnique({
			where: { id: customerId },
			select: { 
			name: true ,
			brandLogo: true
		},
		});
		return {
			name: customer?.name || `Customer (${customerId.slice(0, 8)}...)`,
        		brandLogo: customer?.brandLogo || null

		};
	}
}