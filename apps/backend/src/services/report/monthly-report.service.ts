
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
			const monthStr = this.getMonthString(monthNum, yearNum);
			const { startDate, endDate } = this.getMonthDateRange(monthNum, yearNum);

			let insights = await repository.findMany({
				where: {
					customerId,
					OR: [
						{ month: monthStr },
						{ createdAt: { gte: startDate, lte: endDate } },
					],
				},
				orderBy: { createdAt: 'desc' },
				take: 1,
			});

			if (insights.length > 0) {
				allMonthsData.push(insights[0]);
			} else {
				// Push empty data if no records found
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
				['likes', 'followers'],
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
				['impressions', 'pageViews'],
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
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._youtubeInsightsRepository.model.youTubeInsight,
				customerId,
				month,
				year,
				['subscribers', 'totalViews', 'totalVideos', 'totalContent'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._youtubeInsightsRepository.model.youTubeInsight,
				customerId,
				month,
				year,
				['subscribers', 'totalViews'],
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

	// Updated LinkedIn methods with daily charts
	async getLinkedInCommunityReport(customerId: string, month: number, year: number) {
		try {
			// Monthly data for table
			const monthlyData = await this.getDataForMonths(
				this._linkedInInsightsRepository.model.linkedInInsight,
				customerId,
				month,
				year,
				['followers', 'paidFollowers', 'postsCount'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._linkedInInsightsRepository.model.linkedInInsight,
				customerId,
				month,
				year,
				['followers', 'paidFollowers'],
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
				['followers', 'following'],
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
				['impressions', 'engagement', 'totalContent'],
			);

			// Daily data for chart
			const dailyData = await this.getDailyDataForMonth(
				this._xInsightsRepository.model.xInsight,
				customerId,
				month,
				year,
				['impressions'],
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
		if (platform === 'Instagram' || platform === 'X') {
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
			rows.push(
				['Followers', ...followers.map(String), calculateChange(followers)],
				['Paid Followers', ...paidFollowers.map(String), calculateChange(paidFollowers)],
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
				rows.push(
					['Subscribers', ...subscribers.map(String), calculateChange(subscribers)],
					['Total Views', ...views.map(String), calculateChange(views)],
					['Total Videos', ...videos.map(String), calculateChange(videos)],
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
				rows.push(
					['Impressions', ...xImpressions.map(String), calculateChange(xImpressions)],
					['Engagement', ...engagement.map(String), calculateChange(engagement)],
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

	private kFormatter(num: number): string {
		if (!num) return '0';
		return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
	}

	private parseNumber(value: string | number): number {
		if (typeof value === 'number') return value;
		const parsed = parseFloat(value);
		return isNaN(parsed) ? 0 : parsed;
	}

	async getCustomerName(customerId: string): Promise<string> {
		const customer = await this._prisma.model.customer.findUnique({
			where: { id: customerId },
			select: { name: true },
		});
		return customer?.name || `Customer (${customerId.slice(0, 8)}...)`;
	}
}