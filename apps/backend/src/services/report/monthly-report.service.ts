// // import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
// // import { Injectable } from '@nestjs/common';
// // import { startOfMonth, endOfMonth, format } from 'date-fns';

// // @Injectable()
// // export class MonthlyReportService {
// // 	constructor(
// // 		private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
// // 		private _xInsightsRepository: PrismaRepository<'xInsight'>,
// // 		private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
// // 		private _facebookInsightsRepository: PrismaRepository<'facebookInsight'>,
// // 		private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
// // 	) { }

// // 	// ==================== HELPER METHODS ====================
// // 	private validateInputs(customerId: string, month: number, year: number) {
// // 		if (!customerId || typeof customerId !== 'string') {
// // 			throw new Error('Invalid customerId');
// // 		}
// // 		if (month < 1 || month > 12) {
// // 			throw new Error(`Invalid month: ${month}. Must be 1-12`);
// // 		}
// // 		if (year < 2000 || year > 2100) {
// // 			throw new Error(`Invalid year: ${year}. Must be 2000-2100`);
// // 		}
// // 	}

// // 	private getMonthString(month: number, year: number) {
// // 		this.validateInputs('dummy', month, year);
// // 		return `${year}-${month.toString().padStart(2, '0')}`;
// // 	}

// // 	// ==================== INSTAGRAM ====================
// // 	async getInstagramCommunityReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			const monthString = `${year}-${month.toString().padStart(2, '0')}`;
// // 			const { startDate, endDate } = this.getMonthDateRange(month, year);

// // 			// Try multiple query strategies
// // 			let insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// // 				where: {
// // 					OR: [
// // 						{ businessId: customerId, month: monthString },
// // 						{
// // 							businessId: customerId,
// // 							createdAt: { gte: startDate, lte: endDate },
// // 							month: null  // In case month field wasn't populated
// // 						}
// // 					]
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			// If still no results, try broader query
// // 			if (!insights.length) {
// // 				insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// // 					where: {
// // 						businessId: customerId,
// // 						createdAt: { gte: startDate, lte: endDate }
// // 					},
// // 					orderBy: { createdAt: 'asc' },
// // 				});
// // 			}

// // 			if (!insights.length) {
// // 				console.log(`No Instagram data found for ${customerId} in ${monthString}`);
// // 				return null;
// // 			}

// // 			return {
// // 				table: this.buildCommunityTable(insights, 'Instagram'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt || new Date(year, month - 1, 15), // Fallback to mid-month
// // 					followers: i.followers || 0,
// // 					following: i.following || 0,
// // 					totalContent: i.totalContent || 0,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('Instagram Community Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	private getMonthDateRange(month: number, year: number) {
// // 		const date = new Date(year, month - 1, 1);
// // 		return {
// // 			startDate: startOfMonth(date),
// // 			endDate: endOfMonth(date)
// // 		};
// // 	}



// // 	async getInstagramOverviewReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			return {
// // 				table: this.buildOverviewTable(insights, 'Instagram'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					impressions: i.impressions,
// // 					avgReachPerDay: i.avgReachPerDay,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('Instagram Overview Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	// ==================== FACEBOOK ====================
// // 	async getFacebookCommunityReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			return {
// // 				table: this.buildCommunityTable(insights, 'Facebook'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					likes: i.likes,
// // 					followers: i.followers,
// // 					totalContent: i.totalContent,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('Facebook Community Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	async getFacebookOverviewReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			return {
// // 				table: this.buildOverviewTable(insights, 'Facebook'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					impressions: i.impressions,
// // 					pageViews: i.pageViews,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('Facebook Overview Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	// ==================== YOUTUBE ====================
// // 	async getYoutubeOverviewReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			return {
// // 				table: this.buildOverviewTable(insights, 'YouTube'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					subscribers: i.subscribers,
// // 					totalViews: i.totalViews,
// // 					totalVideos: i.totalVideos,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('YouTube Overview Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	// ==================== LINKEDIN ====================
// // 	async getLinkedInCommunityReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			return {
// // 				table: this.buildCommunityTable(insights, 'LinkedIn'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					followers: i.followers,
// // 					paidFollowers: i.paidFollowers,
// // 					postsCount: i.postsCount,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('LinkedIn Community Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	async getLinkedInOverviewReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			return {
// // 				table: this.buildOverviewTable(insights, 'LinkedIn'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					impressions: i.impressions,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('LinkedIn Overview Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	// ==================== X (Twitter) ====================
// // 	async getXCommunityReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._xInsightsRepository.model.xInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			return {
// // 				table: this.buildCommunityTable(insights, 'X'),
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					followers: i.followers,
// // 					following: i.following,
// // 					totalContent: i.totalContent,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('X Community Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	async getXOverviewReport(customerId: string, month: number, year: number) {
// // 		try {
// // 			this.validateInputs(customerId, month, year);
// // 			const monthString = this.getMonthString(month, year);

// // 			const insights = await this._xInsightsRepository.model.xInsight.findMany({
// // 				where: {
// // 					businessId: customerId,
// // 					month: monthString
// // 				},
// // 				orderBy: { createdAt: 'asc' },
// // 			});

// // 			if (!insights.length) return null;

// // 			const avgEngagement = (
// // 				insights.reduce((sum, i) => sum + (i.engagement || 0), 0) / insights.length
// // 			).toFixed(2);
// // 			const totalInteractions = insights.reduce((sum, i) => sum + (i.interactions || 0), 0);

// // 			return {
// // 				table: {
// // 					Data: [format(new Date(insights[0].createdAt), 'MMMM yyyy')],
// // 					Engagement: [avgEngagement],
// // 					Impressions: [this.kFormatter(insights[insights.length - 1].impressions)],
// // 					Interactions: [this.kFormatter(totalInteractions)],
// // 					TotalContent: [insights[insights.length - 1].totalContent?.toString() || '0'],
// // 				},
// // 				chart: insights.map(i => ({
// // 					date: i.createdAt,
// // 					impressions: i.impressions,
// // 					interactions: i.interactions,
// // 				})),
// // 			};
// // 		} catch (error) {
// // 			console.error('X Overview Error:', error);
// // 			return null;
// // 		}
// // 	}

// // 	// ==================== TABLE BUILDERS ====================
// // 	private buildCommunityTable(insights: any[], platform: string) {
// // 		const lastRecord = insights[insights.length - 1];
// // 		const firstRecord = insights[0];

// // 		if (!lastRecord?.createdAt || isNaN(new Date(lastRecord.createdAt).getTime())) {
// // 			throw new Error('Invalid date in insights data');
// // 		}

// // 		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

// // 		const baseTable = {
// // 			Data: [monthName],
// // 			TotalContent: [lastRecord.totalContent?.toString() || '0'],
// // 			Growth: this.calculateGrowthText(firstRecord, lastRecord, platform),
// // 		};

// // 		if (platform === 'Instagram' || platform === 'X') {
// // 			return {
// // 				...baseTable,
// // 				Followers: [lastRecord.followers?.toString() || '0'],
// // 				Following: [lastRecord.following?.toString() || '0'],
// // 			};
// // 		} else if (platform === 'Facebook') {
// // 			return {
// // 				...baseTable,
// // 				Likes: [lastRecord.likes?.toString() || '0'],
// // 				Followers: [lastRecord.followers?.toString() || '0'],
// // 			};
// // 		} else if (platform === 'LinkedIn') {
// // 			return {
// // 				...baseTable,
// // 				Followers: [lastRecord.followers?.toString() || '0'],
// // 				'Paid Followers': [lastRecord.paidFollowers?.toString() || '0'],
// // 				Posts: [lastRecord.postsCount?.toString() || '0'],
// // 			};
// // 		}
// // 	}

// // 	private buildOverviewTable(insights: any[], platform: string) {
// // 		const lastRecord = insights[insights.length - 1];
// // 		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

// // 		if (platform === 'YouTube') {
// // 			return {
// // 				Data: [monthName],
// // 				Subscribers: [this.kFormatter(lastRecord.subscribers)],
// // 				TotalViews: [this.kFormatter(lastRecord.totalViews)],
// // 				TotalVideos: [lastRecord.totalVideos?.toString() || '0'],
// // 			};
// // 		} else if (platform === 'Instagram') {
// // 			return {
// // 				Data: [monthName],
// // 				Impressions: [this.kFormatter(lastRecord.impressions)],
// // 				'Avg Reach/Day': [this.kFormatter(lastRecord.avgReachPerDay)],
// // 				TotalContent: [lastRecord.totalContent?.toString() || '0'],
// // 			};
// // 		} else if (platform === 'Facebook') {
// // 			return {
// // 				Data: [monthName],
// // 				Impressions: [this.kFormatter(lastRecord.impressions)],
// // 				'Page Views': [this.kFormatter(lastRecord.pageViews)],
// // 				TotalContent: [lastRecord.totalContent?.toString() || '0'],
// // 			};
// // 		} else if (platform === 'LinkedIn') {
// // 			return {
// // 				Data: [monthName],
// // 				Impressions: [this.kFormatter(lastRecord.impressions)],
// // 				Posts: [lastRecord.postsCount?.toString() || '0'],
// // 			};
// // 		}
// // 	}

// // 	private calculateGrowthText(firstRecord: any, lastRecord: any, platform: string): string {
// // 		if (!firstRecord || !lastRecord) return 'Insufficient data';

// // 		let field = 'followers';
// // 		if (platform === 'Facebook') field = 'likes';

// // 		const change = (lastRecord[field] || 0) - (firstRecord[field] || 0);
// // 		const changeText = `${change >= 0 ? '+' : ''}${change}`;

// // 		if (platform === 'Facebook') return `${changeText} New Likes`;
// // 		return `${changeText} New Followers`;
// // 	}

// // 	private kFormatter(num: number): string {
// // 		if (!num) return '0';
// // 		return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
// // 	}
// // }






// import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
// import { Injectable } from '@nestjs/common';
// import { startOfMonth, endOfMonth, format } from 'date-fns';

// @Injectable()
// export class MonthlyReportService {
// 	constructor(
// 		private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
// 		private _xInsightsRepository: PrismaRepository<'xInsight'>,
// 		private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
// 		private _facebookInsightsRepository: PrismaRepository<'facebookInsight'>,
// 		private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
// 	) { }

// 	private validateInputs(customerId: string, month: number, year: number) {
// 		if (!customerId || typeof customerId !== 'string') {
// 			throw new Error('Invalid customerId');
// 		}
// 		if (month < 1 || month > 12) {
// 			throw new Error(`Invalid month: ${month}. Must be 1-12`);
// 		}
// 		if (year < 2000 || year > 2100) {
// 			throw new Error(`Invalid year: ${year}. Must be 2000-2100`);
// 		}
// 	}

// 	private getMonthString(month: number, year: number) {
// 		this.validateInputs('dummy', month, year);
// 		return `${year}-${month.toString().padStart(2, '0')}`;
// 	}

// 	private getMonthDateRange(month: number, year: number) {
// 		const date = new Date(year, month - 1, 1);
// 		return {
// 			startDate: startOfMonth(date),
// 			endDate: endOfMonth(date)
// 		};
// 	}

// 	async getInstagramCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			const monthString = this.getMonthString(month, year);
// 			const { startDate, endDate } = this.getMonthDateRange(month, year);

// 			// First try with month field
// 			let insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			// If no results, try with date range
// 			if (!insights.length) {
// 				insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// 					where: {
// 						customerId,
// 						createdAt: { gte: startDate, lte: endDate }
// 					},
// 					orderBy: { createdAt: 'asc' },
// 				});
// 			}

// 			if (!insights.length) {
// 				console.log(`No Instagram data found for ${customerId} in ${monthString}`);
// 				return null;
// 			}

// 			return {
// 				table: this.buildCommunityTable(insights, 'Instagram'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt || new Date(year, month - 1, 15),
// 					followers: i.followers || 0,
// 					following: i.following || 0,
// 					totalContent: i.totalContent || 0,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Instagram Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getInstagramOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'Instagram'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 					avgReachPerDay: i.avgReachPerDay,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Instagram Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	// ... [keep all other methods the same as in your original file]
// 	// ==================== FACEBOOK ====================
// 	async getFacebookCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
// 				where: {
// 					businessId: customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildCommunityTable(insights, 'Facebook'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					likes: i.likes,
// 					followers: i.followers,
// 					totalContent: i.totalContent,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Facebook Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getFacebookOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
// 				where: {
// 					businessId: customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'Facebook'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 					pageViews: i.pageViews,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Facebook Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	// ==================== YOUTUBE ====================
// 	async getYoutubeOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
// 				where: {
// 					businessId: customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'YouTube'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					subscribers: i.subscribers,
// 					totalViews: i.totalViews,
// 					totalVideos: i.totalVideos,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('YouTube Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	// ==================== LINKEDIN ====================
// 	async getLinkedInCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
// 				where: {
// 					businessId: customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildCommunityTable(insights, 'LinkedIn'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					followers: i.followers,
// 					paidFollowers: i.paidFollowers,
// 					postsCount: i.postsCount,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('LinkedIn Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getLinkedInOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
// 				where: {
// 					businessId: customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'LinkedIn'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('LinkedIn Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	// ==================== X (Twitter) ====================
// 	async getXCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._xInsightsRepository.model.xInsight.findMany({
// 				where: {
// 					businessId: customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildCommunityTable(insights, 'X'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					followers: i.followers,
// 					following: i.following,
// 					totalContent: i.totalContent,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('X Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getXOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._xInsightsRepository.model.xInsight.findMany({
// 				where: {
// 					businessId: customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			const avgEngagement = (
// 				insights.reduce((sum, i) => sum + (i.engagement || 0), 0) / insights.length
// 			).toFixed(2);
// 			const totalInteractions = insights.reduce((sum, i) => sum + (i.interactions || 0), 0);

// 			return {
// 				table: {
// 					Data: [format(new Date(insights[0].createdAt), 'MMMM yyyy')],
// 					Engagement: [avgEngagement],
// 					Impressions: [this.kFormatter(insights[insights.length - 1].impressions)],
// 					Interactions: [this.kFormatter(totalInteractions)],
// 					TotalContent: [insights[insights.length - 1].totalContent?.toString() || '0'],
// 				},
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 					interactions: i.interactions,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('X Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	private buildCommunityTable(insights: any[], platform: string) {
// 		const lastRecord = insights[insights.length - 1];
// 		const firstRecord = insights[0];

// 		if (!lastRecord?.createdAt || isNaN(new Date(lastRecord.createdAt).getTime())) {
// 			throw new Error('Invalid date in insights data');
// 		}

// 		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

// 		const baseTable = {
// 			Data: [monthName],
// 			TotalContent: [lastRecord.totalContent?.toString() || '0'],
// 			Growth: this.calculateGrowthText(firstRecord, lastRecord, platform),
// 		};

// 		if (platform === 'Instagram' || platform === 'X') {
// 			return {
// 				...baseTable,
// 				Followers: [lastRecord.followers?.toString() || '0'],
// 				Following: [lastRecord.following?.toString() || '0'],
// 			};
// 		} else if (platform === 'Facebook') {
// 			return {
// 				...baseTable,
// 				Likes: [lastRecord.likes?.toString() || '0'],
// 				Followers: [lastRecord.followers?.toString() || '0'],
// 			};
// 		} else if (platform === 'LinkedIn') {
// 			return {
// 				...baseTable,
// 				Followers: [lastRecord.followers?.toString() || '0'],
// 				'Paid Followers': [lastRecord.paidFollowers?.toString() || '0'],
// 				Posts: [lastRecord.postsCount?.toString() || '0'],
// 			};
// 		}
// 	}

// 	private buildOverviewTable(insights: any[], platform: string) {
// 		const lastRecord = insights[insights.length - 1];
// 		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

// 		if (platform === 'YouTube') {
// 			return {
// 				Data: [monthName],
// 				Subscribers: [this.kFormatter(lastRecord.subscribers)],
// 				TotalViews: [this.kFormatter(lastRecord.totalViews)],
// 				TotalVideos: [lastRecord.totalVideos?.toString() || '0'],
// 			};
// 		} else if (platform === 'Instagram') {
// 			return {
// 				Data: [monthName],
// 				Impressions: [this.kFormatter(lastRecord.impressions)],
// 				'Avg Reach/Day': [this.kFormatter(lastRecord.avgReachPerDay)],
// 				TotalContent: [lastRecord.totalContent?.toString() || '0'],
// 			};
// 		} else if (platform === 'Facebook') {
// 			return {
// 				Data: [monthName],
// 				Impressions: [this.kFormatter(lastRecord.impressions)],
// 				'Page Views': [this.kFormatter(lastRecord.pageViews)],
// 				TotalContent: [lastRecord.totalContent?.toString() || '0'],
// 			};
// 		} else if (platform === 'LinkedIn') {
// 			return {
// 				Data: [monthName],
// 				Impressions: [this.kFormatter(lastRecord.impressions)],
// 				Posts: [lastRecord.postsCount?.toString() || '0'],
// 			};
// 		}
// 	}

// 	private calculateGrowthText(firstRecord: any, lastRecord: any, platform: string): string {
// 		if (!firstRecord || !lastRecord) return 'Insufficient data';

// 		let field = 'followers';
// 		if (platform === 'Facebook') field = 'likes';

// 		const change = (lastRecord[field] || 0) - (firstRecord[field] || 0);
// 		const changeText = `${change >= 0 ? '+' : ''}${change}`;

// 		if (platform === 'Facebook') return `${changeText} New Likes`;
// 		return `${changeText} New Followers`;
// 	}

// 	private kFormatter(num: number): string {
// 		if (!num) return '0';
// 		return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
// 	}
// }


// import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
// import { Injectable } from '@nestjs/common';
// import { startOfMonth, endOfMonth, format } from 'date-fns';

// @Injectable()
// export class MonthlyReportService {
// 	constructor(
// 		private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
// 		private _xInsightsRepository: PrismaRepository<'xInsight'>,
// 		private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
// 		private _facebookInsightsRepository: PrismaRepository<'facebookInsight'>,
// 		private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
// 	) { }

// 	private validateInputs(customerId: string, month: number, year: number) {
// 		if (!customerId || typeof customerId !== 'string') {
// 			throw new Error('Invalid customerId');
// 		}
// 		if (month < 1 || month > 12) {
// 			throw new Error(`Invalid month: ${month}. Must be 1-12`);
// 		}
// 		if (year < 2000 || year > 2100) {
// 			throw new Error(`Invalid year: ${year}. Must be 2000-2100`);
// 		}
// 	}

// 	private getMonthString(month: number, year: number) {
// 		this.validateInputs('dummy', month, year);
// 		return `${year}-${month.toString().padStart(2, '0')}`;
// 	}

// 	private getMonthDateRange(month: number, year: number) {
// 		const date = new Date(year, month - 1, 1);
// 		return {
// 			startDate: startOfMonth(date),
// 			endDate: endOfMonth(date)
// 		};
// 	}

// 	async getInstagramCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			const monthString = this.getMonthString(month, year);
// 			const { startDate, endDate } = this.getMonthDateRange(month, year);

// 			let insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) {
// 				insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// 					where: {
// 						customerId,
// 						createdAt: { gte: startDate, lte: endDate }
// 					},
// 					orderBy: { createdAt: 'asc' },
// 				});
// 			}

// 			if (!insights.length) {
// 				console.log(`No Instagram data found for ${customerId} in ${monthString}`);
// 				return null;
// 			}

// 			return {
// 				table: this.buildCommunityTable(insights, 'Instagram'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt || new Date(year, month - 1, 15),
// 					followers: i.followers || 0,
// 					following: i.following || 0,
// 					totalContent: i.totalContent || 0,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Instagram Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getInstagramOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'Instagram'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 					avgReachPerDay: i.avgReachPerDay,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Instagram Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	async getFacebookCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);
// 			const { startDate, endDate } = this.getMonthDateRange(month, year);

// 			let insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) {
// 				insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
// 					where: {
// 						customerId,
// 						createdAt: { gte: startDate, lte: endDate }
// 					},
// 					orderBy: { createdAt: 'asc' },
// 				});
// 			}

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildCommunityTable(insights, 'Facebook'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					likes: i.likes,
// 					followers: i.followers,
// 					totalContent: i.totalContent,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Facebook Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getFacebookOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'Facebook'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 					pageViews: i.pageViews,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('Facebook Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	async getYoutubeOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);
// 			const { startDate, endDate } = this.getMonthDateRange(month, year);

// 			let insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) {
// 				insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
// 					where: {
// 						customerId,
// 						createdAt: { gte: startDate, lte: endDate }
// 					},
// 					orderBy: { createdAt: 'asc' },
// 				});
// 			}

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'YouTube'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					subscribers: i.subscribers,
// 					totalViews: i.totalViews,
// 					totalVideos: i.totalVideos,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('YouTube Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	async getLinkedInCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);
// 			const { startDate, endDate } = this.getMonthDateRange(month, year);

// 			let insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) {
// 				insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
// 					where: {
// 						customerId,
// 						createdAt: { gte: startDate, lte: endDate }
// 					},
// 					orderBy: { createdAt: 'asc' },
// 				});
// 			}

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildCommunityTable(insights, 'LinkedIn'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					followers: i.followers,
// 					paidFollowers: i.paidFollowers,
// 					postsCount: i.postsCount,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('LinkedIn Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getLinkedInOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildOverviewTable(insights, 'LinkedIn'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('LinkedIn Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	async getXCommunityReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);
// 			const { startDate, endDate } = this.getMonthDateRange(month, year);

// 			let insights = await this._xInsightsRepository.model.xInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) {
// 				insights = await this._xInsightsRepository.model.xInsight.findMany({
// 					where: {
// 						customerId,
// 						createdAt: { gte: startDate, lte: endDate }
// 					},
// 					orderBy: { createdAt: 'asc' },
// 				});
// 			}

// 			if (!insights.length) return null;

// 			return {
// 				table: this.buildCommunityTable(insights, 'X'),
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					followers: i.followers,
// 					following: i.following,
// 					totalContent: i.totalContent,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('X Community Error:', error);
// 			return null;
// 		}
// 	}

// 	async getXOverviewReport(customerId: string, month: number, year: number) {
// 		try {
// 			this.validateInputs(customerId, month, year);
// 			const monthString = this.getMonthString(month, year);

// 			const insights = await this._xInsightsRepository.model.xInsight.findMany({
// 				where: {
// 					customerId,
// 					month: monthString
// 				},
// 				orderBy: { createdAt: 'asc' },
// 			});

// 			if (!insights.length) return null;

// 			const avgEngagement = (
// 				insights.reduce((sum, i) => sum + (i.engagement || 0), 0) / insights.length
// 			).toFixed(2);
// 			const totalInteractions = insights.reduce((sum, i) => sum + (i.interactions || 0), 0);

// 			return {
// 				table: {
// 					Data: [format(new Date(insights[0].createdAt), 'MMMM yyyy')],
// 					Engagement: [avgEngagement],
// 					Impressions: [this.kFormatter(insights[insights.length - 1].impressions)],
// 					Interactions: [this.kFormatter(totalInteractions)],
// 					TotalContent: [insights[insights.length - 1].totalContent?.toString() || '0'],
// 				},
// 				chart: insights.map(i => ({
// 					date: i.createdAt,
// 					impressions: i.impressions,
// 					interactions: i.interactions,
// 				})),
// 			};
// 		} catch (error) {
// 			console.error('X Overview Error:', error);
// 			return null;
// 		}
// 	}

// 	private buildCommunityTable(insights: any[], platform: string) {
// 		const lastRecord = insights[insights.length - 1];
// 		const firstRecord = insights[0];

// 		if (!lastRecord?.createdAt || isNaN(new Date(lastRecord.createdAt).getTime())) {
// 			throw new Error('Invalid date in insights data');
// 		}

// 		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

// 		const baseTable = {
// 			Data: [monthName],
// 			TotalContent: [lastRecord.totalContent?.toString() || '0'],
// 			Growth: this.calculateGrowthText(firstRecord, lastRecord, platform),
// 		};

// 		if (platform === 'Instagram' || platform === 'X') {
// 			return {
// 				...baseTable,
// 				Followers: [lastRecord.followers?.toString() || '0'],
// 				Following: [lastRecord.following?.toString() || '0'],
// 			};
// 		} else if (platform === 'Facebook') {
// 			return {
// 				...baseTable,
// 				Likes: [lastRecord.likes?.toString() || '0'],
// 				Followers: [lastRecord.followers?.toString() || '0'],
// 			};
// 		} else if (platform === 'LinkedIn') {
// 			return {
// 				...baseTable,
// 				Followers: [lastRecord.followers?.toString() || '0'],
// 				'Paid Followers': [lastRecord.paidFollowers?.toString() || '0'],
// 				Posts: [lastRecord.postsCount?.toString() || '0'],
// 			};
// 		}
// 	}

// 	private buildOverviewTable(insights: any[], platform: string) {
// 		const lastRecord = insights[insights.length - 1];
// 		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

// 		if (platform === 'YouTube') {
// 			return {
// 				Data: [monthName],
// 				Subscribers: [this.kFormatter(lastRecord.subscribers)],
// 				TotalViews: [this.kFormatter(lastRecord.totalViews)],
// 				TotalVideos: [lastRecord.totalVideos?.toString() || '0'],
// 			};
// 		} else if (platform === 'Instagram') {
// 			return {
// 				Data: [monthName],
// 				Impressions: [this.kFormatter(lastRecord.impressions)],
// 				'Avg Reach/Day': [this.kFormatter(lastRecord.avgReachPerDay)],
// 				TotalContent: [lastRecord.totalContent?.toString() || '0'],
// 			};
// 		} else if (platform === 'Facebook') {
// 			return {
// 				Data: [monthName],
// 				Impressions: [this.kFormatter(lastRecord.impressions)],
// 				'Page Views': [this.kFormatter(lastRecord.pageViews)],
// 				TotalContent: [lastRecord.totalContent?.toString() || '0'],
// 			};
// 		} else if (platform === 'LinkedIn') {
// 			return {
// 				Data: [monthName],
// 				Impressions: [this.kFormatter(lastRecord.impressions)],
// 				Posts: [lastRecord.postsCount?.toString() || '0'],
// 			};
// 		}
// 	}

// 	private calculateGrowthText(firstRecord: any, lastRecord: any, platform: string): string {
// 		if (!firstRecord || !lastRecord) return 'Insufficient data';

// 		let field = 'followers';
// 		if (platform === 'Facebook') field = 'likes';

// 		const change = (lastRecord[field] || 0) - (firstRecord[field] || 0);
// 		const changeText = `${change >= 0 ? '+' : ''}${change}`;

// 		if (platform === 'Facebook') return `${changeText} New Likes`;
// 		return `${changeText} New Followers`;
// 	}

// 	private kFormatter(num: number): string {
// 		if (!num) return '0';
// 		return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
// 	}
// }


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
			endDate: endOfMonth(date)
		};
	}

	async getInstagramCommunityReport(customerId: string, month: number, year: number) {
		try {
			const monthString = this.getMonthString(month, year);
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			let insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) {
				insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
					where: {
						customerId,
						createdAt: { gte: startDate, lte: endDate }
					},
					orderBy: { createdAt: 'asc' },
				});
			}

			if (!insights.length) {
				console.log(`No Instagram data found for ${customerId} in ${monthString}`);
				return null;
			}

			return {
				table: this.buildCommunityTable(insights, 'Instagram'),
				chart: insights.map(i => ({
					date: i.createdAt || new Date(year, month - 1, 15),
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
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);

			const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) return null;

			return {
				table: this.buildOverviewTable(insights, 'Instagram'),
				chart: insights.map(i => ({
					date: i.createdAt,
					impressions: i.impressions,
					avgReachPerDay: i.avgReachPerDay,
				})),
			};
		} catch (error) {
			console.error('Instagram Overview Error:', error);
			return null;
		}
	}

	async getFacebookCommunityReport(customerId: string, month: number, year: number) {
		try {
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			let insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) {
				insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
					where: {
						customerId,
						createdAt: { gte: startDate, lte: endDate }
					},
					orderBy: { createdAt: 'asc' },
				});
			}

			if (!insights.length) return null;

			return {
				table: this.buildCommunityTable(insights, 'Facebook'),
				chart: insights.map(i => ({
					date: i.createdAt,
					likes: i.likes,
					followers: i.followers,
					totalContent: i.totalContent,
				})),
			};
		} catch (error) {
			console.error('Facebook Community Error:', error);
			return null;
		}
	}

	async getFacebookOverviewReport(customerId: string, month: number, year: number) {
		try {
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);

			const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) return null;

			return {
				table: this.buildOverviewTable(insights, 'Facebook'),
				chart: insights.map(i => ({
					date: i.createdAt,
					impressions: i.impressions,
					pageViews: i.pageViews,
				})),
			};
		} catch (error) {
			console.error('Facebook Overview Error:', error);
			return null;
		}
	}

	async getYoutubeOverviewReport(customerId: string, month: number, year: number) {
		try {
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			let insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) {
				insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
					where: {
						customerId,
						createdAt: { gte: startDate, lte: endDate }
					},
					orderBy: { createdAt: 'asc' },
				});
			}

			if (!insights.length) return null;

			return {
				table: this.buildOverviewTable(insights, 'YouTube'),
				chart: insights.map(i => ({
					date: i.createdAt,
					subscribers: i.subscribers,
					totalViews: i.totalViews,
					totalVideos: i.totalVideos,
				})),
			};
		} catch (error) {
			console.error('YouTube Overview Error:', error);
			return null;
		}
	}

	async getLinkedInCommunityReport(customerId: string, month: number, year: number) {
		try {
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			let insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) {
				insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
					where: {
						customerId,
						createdAt: { gte: startDate, lte: endDate }
					},
					orderBy: { createdAt: 'asc' },
				});
			}

			if (!insights.length) return null;

			return {
				table: this.buildCommunityTable(insights, 'LinkedIn'),
				chart: insights.map(i => ({
					date: i.createdAt,
					followers: i.followers,
					paidFollowers: i.paidFollowers,
					postsCount: i.postsCount,
				})),
			};
		} catch (error) {
			console.error('LinkedIn Community Error:', error);
			return null;
		}
	}

	async getLinkedInOverviewReport(customerId: string, month: number, year: number) {
		try {
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);

			const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) return null;

			return {
				table: this.buildOverviewTable(insights, 'LinkedIn'),
				chart: insights.map(i => ({
					date: i.createdAt,
					impressions: i.impressions,
				})),
			};
		} catch (error) {
			console.error('LinkedIn Overview Error:', error);
			return null;
		}
	}

	async getXCommunityReport(customerId: string, month: number, year: number) {
		try {
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			let insights = await this._xInsightsRepository.model.xInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) {
				insights = await this._xInsightsRepository.model.xInsight.findMany({
					where: {
						customerId,
						createdAt: { gte: startDate, lte: endDate }
					},
					orderBy: { createdAt: 'asc' },
				});
			}

			if (!insights.length) return null;

			return {
				table: this.buildCommunityTable(insights, 'X'),
				chart: insights.map(i => ({
					date: i.createdAt,
					followers: i.followers,
					following: i.following,
					totalContent: i.totalContent,
				})),
			};
		} catch (error) {
			console.error('X Community Error:', error);
			return null;
		}
	}

	async getXOverviewReport(customerId: string, month: number, year: number) {
		try {
			this.validateInputs(customerId, month, year);
			const monthString = this.getMonthString(month, year);

			const insights = await this._xInsightsRepository.model.xInsight.findMany({
				where: {
					customerId,
					month: monthString
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!insights.length) return null;

			const avgEngagement = (
				insights.reduce((sum, i) => sum + (i.engagement || 0), 0) / insights.length
			).toFixed(2);
			const totalInteractions = insights.reduce((sum, i) => sum + (i.interactions || 0), 0);

			return {
				table: {
					Data: [format(new Date(insights[0].createdAt), 'MMMM yyyy')],
					Engagement: [avgEngagement],
					Impressions: [this.kFormatter(insights[insights.length - 1].impressions)],
					Interactions: [this.kFormatter(totalInteractions)],
					TotalContent: [insights[insights.length - 1].totalContent?.toString() || '0'],
				},
				chart: insights.map(i => ({
					date: i.createdAt,
					impressions: i.impressions,
					interactions: i.interactions,
				})),
			};
		} catch (error) {
			console.error('X Overview Error:', error);
			return null;
		}
	}

	private buildCommunityTable(insights: any[], platform: string) {
		const lastRecord = insights[insights.length - 1];
		const firstRecord = insights[0];

		if (!lastRecord?.createdAt || isNaN(new Date(lastRecord.createdAt).getTime())) {
			throw new Error('Invalid date in insights data');
		}

		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

		const baseTable = {
			Data: [monthName],
			TotalContent: [lastRecord.totalContent?.toString() || '0'],
			Growth: this.calculateGrowthText(firstRecord, lastRecord, platform),
		};

		if (platform === 'Instagram' || platform === 'X') {
			return {
				...baseTable,
				Followers: [lastRecord.followers?.toString() || '0'],
				Following: [lastRecord.following?.toString() || '0'],
			};
		} else if (platform === 'Facebook') {
			return {
				...baseTable,
				Likes: [lastRecord.likes?.toString() || '0'],
				Followers: [lastRecord.followers?.toString() || '0'],
			};
		} else if (platform === 'LinkedIn') {
			return {
				...baseTable,
				Followers: [lastRecord.followers?.toString() || '0'],
				'Paid Followers': [lastRecord.paidFollowers?.toString() || '0'],
				Posts: [lastRecord.postsCount?.toString() || '0'],
			};
		}
	}

	private buildOverviewTable(insights: any[], platform: string) {
		const lastRecord = insights[insights.length - 1];
		const monthName = format(new Date(lastRecord.createdAt), 'MMMM yyyy');

		if (platform === 'YouTube') {
			return {
				Data: [monthName],
				Subscribers: [this.kFormatter(lastRecord.subscribers)],
				TotalViews: [this.kFormatter(lastRecord.totalViews)],
				TotalVideos: [lastRecord.totalVideos?.toString() || '0'],
			};
		} else if (platform === 'Instagram') {
			return {
				Data: [monthName],
				Impressions: [this.kFormatter(lastRecord.impressions)],
				'Avg Reach/Day': [this.kFormatter(lastRecord.avgReachPerDay)],
				TotalContent: [lastRecord.totalContent?.toString() || '0'],
			};
		} else if (platform === 'Facebook') {
			return {
				Data: [monthName],
				Impressions: [this.kFormatter(lastRecord.impressions)],
				'Page Views': [this.kFormatter(lastRecord.pageViews)],
				TotalContent: [lastRecord.totalContent?.toString() || '0'],
			};
		} else if (platform === 'LinkedIn') {
			return {
				Data: [monthName],
				Impressions: [this.kFormatter(lastRecord.impressions)],
				Posts: [lastRecord.postsCount?.toString() || '0'],
			};
		}
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
}