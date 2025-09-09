
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
		private _threadsInsightsRepository: PrismaRepository<'threadsInsight'>,
		private _pinterestInsightsRepository: PrismaRepository<'pinterestPostPerformance'>,
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

			// Get the latest data point for the requested month
			const latestData = insights[insights.length - 1];

			// For table data, get data for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get the last data point for each month
				const lastDataPoint = await this._instagramInsightsRepository.model.instagramInsight.findFirst({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'desc' },
				});

				if (lastDataPoint) {
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						followers: lastDataPoint.followers || 0,
						following: lastDataPoint.following || 0,
						totalContent: lastDataPoint.totalContent || 0,
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						followers: 0,
						following: 0,
						totalContent: 0,
					});
				}
			}

			// Calculate monthly totals
			const firstData = insights[0];
			const monthlyTotals = {
				followers: latestData.followers || 0, // Use latest for followers (it's cumulative)
				following: latestData.following || 0, // Use latest for following (it's cumulative)
				// For totalContent, if values are daily increments (0 or 1), sum them up
				// If values appear to be cumulative, calculate the difference
				totalContent: (() => {
					// Check if totalContent appears to be daily increments (all values are 0 or 1)
					const allValuesSmall = insights.every(i => (i.totalContent || 0) <= 1);

					if (allValuesSmall) {
						// Sum up daily increments
						return insights.reduce((sum, item) => sum + (item.totalContent || 0), 0);
					} else {
						// Treat as cumulative - subtract first from last
						return firstData && latestData
							? Math.max(0, (latestData.totalContent || 0) - (firstData.totalContent || 0))
							: (latestData.totalContent || 0);
					}
				})()
			};

			// Convert daily increments to cumulative for chart if needed
			let cumulativeContent = 0;
			const chartData = insights.map(i => {
				// If totalContent appears to be daily increments, make it cumulative for the chart
				const allValuesSmall = insights.every(item => (item.totalContent || 0) <= 1);
				if (allValuesSmall) {
					cumulativeContent += (i.totalContent || 0);
					return {
						date: i.createdAt,
						followers: i.followers || 0,
						following: i.following || 0,
						totalContent: cumulativeContent,
					};
				} else {
					return {
						date: i.createdAt,
						followers: i.followers || 0,
						following: i.following || 0,
						totalContent: i.totalContent || 0,
					};
				}
			});

			return {
				table: this.buildCommunityTable(allMonthsData, 'Instagram'),
				chart: chartData,
				latestData: {
					followers: latestData.followers || 0,
					following: latestData.following || 0,
					totalContent: latestData.totalContent || 0,
				},
				monthlyTotals: monthlyTotals
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
					totalContent: true
				},
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get monthly totals for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for the month
				const monthlyDataPoints = await this._instagramInsightsRepository.model.instagramInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					select: {
						createdAt: true,
						impressions: true,
						avgReachPerDay: true,
						totalContent: true
					},
				});

				if (monthlyDataPoints.length > 0) {
					// Calculate monthly totals
					const monthlyTotal = {
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						impressions: monthlyDataPoints.reduce((sum, item) => sum + (item.impressions || 0), 0),
						avgReachPerDay: Math.round(
							monthlyDataPoints.reduce((sum, item) => sum + (item.avgReachPerDay || 0), 0) / monthlyDataPoints.length
						),
						totalContent: (() => {
							// Check if totalContent appears to be daily increments
							const allValuesSmall = monthlyDataPoints.every(i => (i.totalContent || 0) <= 1);
							if (allValuesSmall) {
								// Sum up daily increments
								return monthlyDataPoints.reduce((sum, item) => sum + (item.totalContent || 0), 0);
							} else {
								// Get difference between last and first
								const firstData = monthlyDataPoints[0];
								const lastData = monthlyDataPoints[monthlyDataPoints.length - 1];
								return Math.max(0, (lastData.totalContent || 0) - (firstData.totalContent || 0));
							}
						})()
					};
					allMonthsData.push(monthlyTotal);
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						impressions: 0,
						avgReachPerDay: 0,
						totalContent: 0,
					});
				}
			}

			// Calculate monthly totals
			const firstData = dailyData[0];
			const monthlyTotals = {
				impressions: dailyData.reduce((sum, item) => sum + (item.impressions || 0), 0),
				// Calculate average reach per day across the month
				avgReachPerDay: Math.round(
					dailyData.reduce((sum, item) => sum + (item.avgReachPerDay || 0), 0) / dailyData.length
				),
				// For totalContent, handle both daily increments and cumulative values
				totalContent: (() => {
					// Check if totalContent appears to be daily increments (all values are 0 or 1)
					const allValuesSmall = dailyData.every(i => (i.totalContent || 0) <= 1);

					if (allValuesSmall) {
						// Sum up daily increments
						return dailyData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
					} else {
						// Treat as cumulative - subtract first from last
						return firstData && latestData
							? Math.max(0, (latestData.totalContent || 0) - (firstData.totalContent || 0))
							: (latestData.totalContent || 0);
					}
				})()
			};

			// Convert daily increments to cumulative for chart if needed
			let cumulativeContent = 0;
			const chartData = dailyData.map(item => {
				// If totalContent appears to be daily increments, make it cumulative for the chart
				const allValuesSmall = dailyData.every(i => (i.totalContent || 0) <= 1);
				if (allValuesSmall) {
					cumulativeContent += (item.totalContent || 0);
					return {
						date: item.createdAt,
						impressions: item.impressions || 0,
						avgReachPerDay: item.avgReachPerDay || 0,
						totalContent: cumulativeContent
					};
				} else {
					return {
						date: item.createdAt,
						impressions: item.impressions || 0,
						avgReachPerDay: item.avgReachPerDay || 0,
						totalContent: item.totalContent || 0
					};
				}
			});

			return {
				table: this.buildOverviewTable(allMonthsData, 'Instagram'),
				chart: chartData,
				latestData: {
					impressions: latestData.impressions || 0,
					avgReachPerDay: latestData.avgReachPerDay || 0,
					totalContent: latestData.totalContent || 0,
				},
				monthlyTotals: monthlyTotals
			};
		} catch (error) {
			console.error('Instagram Overview Error:', error);
			return null;
		}
	}

	// Updated Facebook methods with daily charts
	async getFacebookCommunityReport(customerId: string, month: number, year: number) {
		try {
			console.log('=== FACEBOOK COMMUNITY REPORT ===');
			console.log('CustomerId:', customerId);
			console.log('Month:', month, 'Year:', year);
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._facebookInsightsRepository.model.facebookInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months using last data points
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get the last data point for each month
				const lastDataPoint = await this._facebookInsightsRepository.model.facebookInsight.findFirst({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'desc' },
				});

				if (lastDataPoint) {
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						likes: lastDataPoint.likes || 0,
						followers: lastDataPoint.followers || 0,
						totalContent: lastDataPoint.totalContent || 0,
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						likes: 0,
						followers: 0,
						totalContent: 0,
					});
				}
			}

			// Remove duplicates - keep only one entry per day
			const uniqueDailyData = [];
			const seenDates = new Set();

			for (const item of dailyData) {
				const dateKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
				if (!seenDates.has(dateKey)) {
					seenDates.add(dateKey);
					uniqueDailyData.push(item);
				}
			}

			// Calculate monthly totals
			const firstData = uniqueDailyData[0];
			const lastUniqueData = uniqueDailyData[uniqueDailyData.length - 1] || latestData;
			const monthlyTotals = {
				likes: latestData.likes || 0, // Use latest for likes (it's cumulative)
				followers: latestData.followers || 0, // Use latest for followers (it's cumulative)
				// For totalContent, handle both daily increments and cumulative values
				totalContent: (() => {
					// Check if totalContent appears to be daily increments (all values are 0 or 1)
					const allValuesSmall = uniqueDailyData.every(i => (i.totalContent || 0) <= 1);

					if (allValuesSmall) {
						// Sum up daily increments
						return uniqueDailyData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
					} else {
						// Treat as cumulative - subtract first from last
						return firstData && lastUniqueData
							? Math.max(0, (lastUniqueData.totalContent || 0) - (firstData.totalContent || 0))
							: (lastUniqueData.totalContent || 0);
					}
				})()
			};

			// Keep daily values for chart (don't convert to cumulative)
			const chartData = uniqueDailyData.map(item => {
				return {
					date: item.createdAt,
					likes: item.likes || 0,
					followers: item.followers || 0,
					totalContent: item.totalContent || 0, // Show daily values
				};
			});

			return {
				table: this.buildCommunityTable(allMonthsData, 'Facebook'),
				chart: chartData,
				latestData: {
					likes: latestData.likes || 0,
					followers: latestData.followers || 0,
					totalContent: latestData.totalContent || 0,
				},
				monthlyTotals: monthlyTotals,
				summary: {
					likes: latestData.likes || 0, // Latest data for likes
					followers: latestData.followers || 0, // Latest data for followers
					totalContent: monthlyTotals.totalContent // Monthly total for content
				}
			};
		} catch (error) {
			console.error('Facebook Community Error:', error);
			return null;
		}
	}

	async getFacebookOverviewReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._facebookInsightsRepository.model.facebookInsight.findMany({
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
					pageViews: true,
					totalContent: true
				},
			});

			if (!dailyData.length) return null;

			// Remove duplicates - keep only one entry per day
			const uniqueDailyData = [];
			const seenDates = new Set();

			for (const item of dailyData) {
				const dateKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
				if (!seenDates.has(dateKey)) {
					seenDates.add(dateKey);
					uniqueDailyData.push(item);
				}
			}

			// Get the latest data point for the requested month
			const latestData = uniqueDailyData[uniqueDailyData.length - 1];

			// For table data, get monthly totals for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for the month
				const monthlyDataPoints = await this._facebookInsightsRepository.model.facebookInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					select: {
						createdAt: true,
						impressions: true,
						pageViews: true,
						totalContent: true
					},
				});

				// Remove duplicates for monthly data
				const uniqueMonthlyData = [];
				const monthSeenDates = new Set();

				for (const item of monthlyDataPoints) {
					const dateKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
					if (!monthSeenDates.has(dateKey)) {
						monthSeenDates.add(dateKey);
						uniqueMonthlyData.push(item);
					}
				}

				if (uniqueMonthlyData.length > 0) {
					// Calculate monthly totals
					const monthlyTotal = {
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						impressions: uniqueMonthlyData.reduce((sum, item) => sum + (item.impressions || 0), 0),
						pageViews: uniqueMonthlyData.reduce((sum, item) => sum + (item.pageViews || 0), 0),
						totalContent: (() => {
							// Check if totalContent appears to be daily increments
							const allValuesSmall = uniqueMonthlyData.every(i => (i.totalContent || 0) <= 1);
							if (allValuesSmall) {
								// Sum up daily increments
								return uniqueMonthlyData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
							} else {
								// Get difference between last and first
								const firstData = uniqueMonthlyData[0];
								const lastData = uniqueMonthlyData[uniqueMonthlyData.length - 1];
								return Math.max(0, (lastData.totalContent || 0) - (firstData.totalContent || 0));
							}
						})()
					};
					allMonthsData.push(monthlyTotal);
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						impressions: 0,
						pageViews: 0,
						totalContent: 0,
					});
				}
			}

			// Calculate monthly totals from unique daily data
			const firstData = uniqueDailyData[0];
			const monthlyTotals = {
				impressions: uniqueDailyData.reduce((sum, item) => sum + (item.impressions || 0), 0),
				pageViews: uniqueDailyData.reduce((sum, item) => sum + (item.pageViews || 0), 0),
				// For totalContent, handle both daily increments and cumulative values
				totalContent: (() => {
					// Check if totalContent appears to be daily increments (all values are 0 or 1)
					const allValuesSmall = uniqueDailyData.every(i => (i.totalContent || 0) <= 1);

					if (allValuesSmall) {
						// Sum up daily increments
						return uniqueDailyData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
					} else {
						// Treat as cumulative - subtract first from last
						return firstData && latestData
							? Math.max(0, (latestData.totalContent || 0) - (firstData.totalContent || 0))
							: (latestData.totalContent || 0);
					}
				})()
			};

			// Keep daily values for chart (don't convert to cumulative)
			const chartData = uniqueDailyData.map(item => ({
				date: item.createdAt,
				impressions: item.impressions || 0,
				pageViews: item.pageViews || 0,
				totalContent: item.totalContent || 0 // Show daily values
			}));

			return {
				table: this.buildOverviewTable(allMonthsData, 'Facebook'),
				chart: chartData,
				latestData: {
					impressions: latestData.impressions || 0,
					pageViews: latestData.pageViews || 0,
					totalContent: latestData.totalContent || 0,
				},
				monthlyTotals: monthlyTotals
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
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for each month
				const monthData = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthData.length > 0) {
					// Get latest subscriber count (last data point)
					const lastDataPoint = monthData[monthData.length - 1];
					
					// Calculate monthly totals
					const monthlyTotals = {
						subscribers: lastDataPoint.subscribers || 0, // Latest subscriber count
						totalViews: monthData.reduce((sum, item) => sum + (item.totalViews || 0), 0), // Sum of all views
						totalVideos: monthData.reduce((sum, item) => sum + (item.totalVideos || 0), 0), // Sum of all videos
						totalLikes: monthData.reduce((sum, item) => sum + (item.totalLikes || 0), 0), // Sum of all likes
						totalComments: monthData.reduce((sum, item) => sum + (item.totalComments || 0), 0) // Sum of all comments
					};

					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						...monthlyTotals
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						subscribers: 0,
						totalViews: 0,
						totalVideos: 0,
						totalLikes: 0,
						totalComments: 0
					});
				}
			}

			return {
				table: this.buildYoutubeCommunityTable(allMonthsData),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					subscribers: item.subscribers || 0,
					totalViews: item.totalViews || 0,
					totalVideos: item.totalVideos || 0,
					totalLikes: item.totalLikes || 0,
					totalComments: item.totalComments || 0
				})),
				latestData: {
					subscribers: latestData.subscribers || 0,
					totalViews: latestData.totalViews || 0,
					totalVideos: latestData.totalVideos || 0,
					totalLikes: latestData.totalLikes || 0,
					totalComments: latestData.totalComments || 0
				}
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
			const previous = values[values.length - 2]; // Previous month
			const current = values[values.length - 1];  // Current month
			if (previous === 0) {
				if (current === 0) return '0%';
				return `${current * 100}%`; // e.g., 5 → 500%
			}
			const change = ((current - previous) / previous) * 100;
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
			['Subscribers', ...subscribers.map(v => this.kFormatter(v)), calculateChange(subscribers)],
			['Total Views', ...totalViews.map(v => this.kFormatter(v)), calculateChange(totalViews)],
			['Total Videos', ...totalVideos.map(String), calculateChange(totalVideos)],
			['Total likes', ...totalLikes.map(v => this.kFormatter(v)), calculateChange(totalLikes)],
			['Total Comments', ...totalComments.map(v => this.kFormatter(v)), calculateChange(totalComments)]
		);

		return {
			Data: headers,
			Rows: rows,
			//Growth: `Subscribers growth: ${subscribers[subscribers.length - 1] - subscribers[subscribers.length - 2]}`
		};
	}

	// Updated LinkedIn methods with daily charts
	async getLinkedInCommunityReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months with monthly totals
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for each month to calculate totals
				const monthData = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthData.length > 0) {
					// Get latest value for followers (last data point)
					const lastDataPoint = monthData[monthData.length - 1];
					
					// Calculate monthly totals for other metrics
					const monthlyTotals = {
						paidFollowers: Math.abs(monthData.reduce((sum, item) => sum + (item.paidFollowers || 0), 0)),
						postsCount: Math.abs(monthData.reduce((sum, item) => sum + (item.postsCount || 0), 0)),
						impressions: Math.abs(monthData.reduce((sum, item) => sum + (item.impressions || 0), 0))
					};
					
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						followers: lastDataPoint.followers || 0,  // Latest value
						paidFollowers: monthlyTotals.paidFollowers,  // Monthly total
						postsCount: monthlyTotals.postsCount,  // Monthly total
						impressions: monthlyTotals.impressions  // Monthly total
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						followers: 0,
						paidFollowers: 0,
						postsCount: 0,
						impressions: 0
					});
				}
			}

			return {
				table: this.buildCommunityTable(allMonthsData, 'LinkedIn'),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					followers: item.followers || 0,
					paidFollowers: item.paidFollowers || 0,
					postsCount: item.postsCount || 0,
					impressions: item.impressions || 0
				})),
				latestData: {
					followers: latestData.followers || 0,
					paidFollowers: latestData.paidFollowers || 0,
					postsCount: latestData.postsCount || 0,
					impressions: latestData.impressions || 0
				}
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
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._xInsightsRepository.model.xInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for each month to calculate totals
				const monthData = await this._xInsightsRepository.model.xInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthData.length > 0) {
					// Get latest values for followers and following
					const lastDataPoint = monthData[monthData.length - 1];
					
					// Calculate monthly total for content
					const monthlyContentTotal = monthData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
					
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						followers: lastDataPoint.followers || 0,  // Latest value
						following: lastDataPoint.following || 0,  // Latest value
						totalContent: monthlyContentTotal  // Monthly total
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						followers: 0,
						following: 0,
						totalContent: 0
					});
				}
			}

			return {
				table: this.buildCommunityTable(allMonthsData, 'X'),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					followers: item.followers || 0,
					following: item.following || 0,
					totalContent: item.totalContent || 0
				})),
				latestData: {
					followers: latestData.followers || 0,
					following: latestData.following || 0,
					totalContent: latestData.totalContent || 0
				}
			};
		} catch (error) {
			console.error('X Community Error:', error);
			return null;
		}
	}

	async getXOverviewReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._xInsightsRepository.model.xInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months with monthly totals
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for each month to calculate totals
				const monthData = await this._xInsightsRepository.model.xInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthData.length > 0) {
					// Calculate monthly totals
					const monthlyTotals = {
						impressions: monthData.reduce((sum, item) => sum + (item.impressions || 0), 0),
						interactions: monthData.reduce((sum, item) => sum + (item.interactions || 0), 0),
						engagement: monthData.reduce((sum, item) => sum + (item.engagement || 0), 0) / monthData.length,
						totalContent: monthData.reduce((sum, item) => sum + (item.totalContent || 0), 0)
					};
					
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						...monthlyTotals
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						impressions: 0,
						engagement: 0,
						interactions: 0,
						totalContent: 0
					});
				}
			}

			return {
				table: this.buildOverviewTable(allMonthsData, 'X'),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					impressions: item.impressions || 0,
					engagement: item.engagement || 0,
					interactions: item.interactions || 0,
					totalContent: item.totalContent || 0
				})),
				latestData: {
					impressions: latestData.impressions || 0,
					engagement: latestData.engagement || 0,
					interactions: latestData.interactions || 0,
					totalContent: latestData.totalContent || 0
				}
			};
		} catch (error) {
			console.error('X Overview Error:', error);
			return null;
		}
	}

	// Threads methods
	async getThreadsCommunityReport(customerId: string, month: number, year: number) {
		try {
			console.log('getThreadsCommunityReport called with:', { customerId, month, year });
			const { startDate, endDate } = this.getMonthDateRange(month, year);
			console.log('Date range:', { startDate, endDate });

			// Get daily data for the requested month
			const dailyData = await this._threadsInsightsRepository.model.threadsInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			console.log('Threads daily data found:', dailyData.length, 'records');
			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for each month to calculate totals
				const monthData = await this._threadsInsightsRepository.model.threadsInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthData.length > 0) {
					const lastDataPoint = monthData[monthData.length - 1];
					const firstDataPoint = monthData[0];

					// For totalContent, calculate the monthly total
					const monthlyContentTotal = (() => {
						// Check if totalContent appears to be daily increments
						const allValuesSmall = monthData.every(i => (i.totalContent || 0) <= 1);

						if (allValuesSmall) {
							// Sum up daily increments
							return monthData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
						} else {
							// Treat as cumulative - subtract first from last
							return Math.max(0, (lastDataPoint.totalContent || 0) - (firstDataPoint.totalContent || 0));
						}
					})();

					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						followers: lastDataPoint.followers || 0,
						totalContent: monthlyContentTotal
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						followers: 0,
						totalContent: 0
					});
				}
			}

			// Calculate monthly totals
			const monthlyTotals = {
				followers: latestData.followers || 0, // Use latest for followers (it's cumulative)
				// For totalContent, handle both daily increments and cumulative values
				totalContent: (() => {
					// Check if totalContent appears to be daily increments (all values are 0 or 1)
					const allValuesSmall = dailyData.every(i => (i.totalContent || 0) <= 1);

					if (allValuesSmall) {
						// Sum up daily increments
						return dailyData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
					} else {
						// Treat as cumulative - subtract first from last
						const firstData = dailyData[0];
						return firstData && latestData
							? Math.max(0, (latestData.totalContent || 0) - (firstData.totalContent || 0))
							: (latestData.totalContent || 0);
					}
				})()
			};

			// Convert daily increments to cumulative for chart if needed
			let cumulativeContent = 0;
			const chartData = dailyData.map(item => {
				// If totalContent appears to be daily increments, make it cumulative for the chart
				const allValuesSmall = dailyData.every(i => (i.totalContent || 0) <= 1);
				if (allValuesSmall) {
					cumulativeContent += (item.totalContent || 0);
					return {
						date: item.createdAt,
						followers: item.followers || 0,
						totalContent: cumulativeContent,
					};
				} else {
					return {
						date: item.createdAt,
						followers: item.followers || 0,
						totalContent: item.totalContent || 0,
					};
				}
			});

			return {
				table: this.buildCommunityTable(allMonthsData, 'Threads'),
				chart: chartData,
				latestData: {
					followers: latestData.followers || 0,
					totalContent: latestData.totalContent || 0,
				},
				monthlyTotals: monthlyTotals
			};
		} catch (error) {
			console.error('Threads Community Error:', error);
			return null;
		}
	}

	async getThreadsOverviewReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._threadsInsightsRepository.model.threadsInsight.findMany({
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
					engagement: true,
					interactions: true,
					totalContent: true
				},
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get monthly totals for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for the month
				const monthlyDataPoints = await this._threadsInsightsRepository.model.threadsInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					select: {
						createdAt: true,
						impressions: true,
						engagement: true,
						interactions: true,
						totalContent: true
					},
				});

				if (monthlyDataPoints.length > 0) {
					// Calculate monthly totals
					const monthlyTotal = {
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						impressions: monthlyDataPoints.reduce((sum, item) => sum + (item.impressions || 0), 0),
						engagement: monthlyDataPoints.reduce((sum, item) => sum + (item.engagement || 0), 0) / monthlyDataPoints.length, // Average
						interactions: monthlyDataPoints.reduce((sum, item) => sum + (item.interactions || 0), 0),
						totalContent: (() => {
							// Check if totalContent appears to be daily increments
							const allValuesSmall = monthlyDataPoints.every(i => (i.totalContent || 0) <= 1);
							if (allValuesSmall) {
								// Sum up daily increments
								return monthlyDataPoints.reduce((sum, item) => sum + (item.totalContent || 0), 0);
							} else {
								// Get difference between last and first
								const firstData = monthlyDataPoints[0];
								const lastData = monthlyDataPoints[monthlyDataPoints.length - 1];
								return Math.max(0, (lastData.totalContent || 0) - (firstData.totalContent || 0));
							}
						})()
					};
					allMonthsData.push(monthlyTotal);
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						impressions: 0,
						engagement: 0,
						interactions: 0,
						totalContent: 0,
					});
				}
			}

			// Calculate monthly totals
			const monthlyTotals = {
				impressions: dailyData.reduce((sum, item) => sum + (item.impressions || 0), 0),
				engagement: dailyData.reduce((sum, item) => sum + (item.engagement || 0), 0) / dailyData.length, // Average
				interactions: dailyData.reduce((sum, item) => sum + (item.interactions || 0), 0),
				// For totalContent, handle both daily increments and cumulative values
				totalContent: (() => {
					// Check if totalContent appears to be daily increments (all values are 0 or 1)
					const allValuesSmall = dailyData.every(i => (i.totalContent || 0) <= 1);

					if (allValuesSmall) {
						// Sum up daily increments
						return dailyData.reduce((sum, item) => sum + (item.totalContent || 0), 0);
					} else {
						// Treat as cumulative - subtract first from last
						const firstData = dailyData[0];
						return firstData && latestData
							? Math.max(0, (latestData.totalContent || 0) - (firstData.totalContent || 0))
							: (latestData.totalContent || 0);
					}
				})()
			};

			// Keep daily values for chart
			const chartData = dailyData.map(item => ({
				date: item.createdAt,
				impressions: item.impressions || 0,
				engagement: item.engagement || 0,
				interactions: item.interactions || 0,
				totalContent: item.totalContent || 0
			}));

			return {
				table: this.buildOverviewTable(allMonthsData, 'Threads'),
				chart: chartData,
				latestData: {
					impressions: latestData.impressions || 0,
					engagement: latestData.engagement || 0,
					interactions: latestData.interactions || 0,
					totalContent: latestData.totalContent || 0,
				},
				monthlyTotals: monthlyTotals
			};
		} catch (error) {
			console.error('Threads Overview Error:', error);
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
			const previous = values[values.length - 2]; // Previous month
			const current = values[values.length - 1];  // Current month
			if (previous === 0) {
				if (current === 0) return '0%';
				return `${(current * 100).toFixed(2)}%`; // e.g., 5 → 500.00%
			}
			const change = ((current - previous) / previous) * 100;
			return `${change.toFixed(2)}%`;
		};

		// Prepare table data
		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		// For Threads and Pinterest, don't add Total Content here - we'll add it differently
		if (platform !== 'Threads' && platform !== 'Pinterest') {
			// Common metrics
			const totalContents = insights.map(i => parseInt(i.totalContent) || 0);
			rows.push([
				'Total Content',
				...totalContents.map(String),
				calculateChange(totalContents),
			]);
		}

		// Platform-specific metrics
		if (platform === 'Instagram') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const following = insights.map(i => parseInt(i.following) || 0);
			rows.push(
				['Followers', ...followers.map(v => this.kFormatter(v)), calculateChange(followers)],
				['Following', ...following.map(v => this.kFormatter(v)), calculateChange(following)],
			);
		} else if (platform === 'Facebook') {
			const likes = insights.map(i => parseInt(i.likes) || 0);
			const followers = insights.map(i => parseInt(i.followers) || 0);
			rows.push(
				['Likes', ...likes.map(v => this.kFormatter(v)), calculateChange(likes)],
				['Followers', ...followers.map(v => this.kFormatter(v)), calculateChange(followers)],
			);
		} else if (platform === 'LinkedIn') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const paidFollowers = insights.map(i => parseInt(i.paidFollowers) || 0);
			const impressions = insights.map(i => parseInt(i.impressions) || 0);
			const postsCount = insights.map(i => parseInt(i.postsCount) || 0);
			rows.push(
				['Followers', ...followers.map(v => this.kFormatter(v)), calculateChange(followers)],
				['Paid Followers', ...paidFollowers.map(v => this.kFormatter(v)), calculateChange(paidFollowers)],
				['Impressions', ...impressions.map(v => this.kFormatter(v)), calculateChange(impressions)],
				['Posts', ...postsCount.map(String), calculateChange(postsCount)],
			);
		} else if (platform === 'X') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const following = insights.map(i => parseInt(i.following) || 0);
			//const totalContent = insights.map(i => parseInt(i.totalContent) || 0);
			rows.push(
				['Followers', ...followers.map(v => this.kFormatter(v)), calculateChange(followers)],
				['Following', ...following.map(v => this.kFormatter(v)), calculateChange(following)],
				//['Total Content', ...totalContent.map(String), calculateChange(totalContent)],
			);
		} else if (platform === 'Threads') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const totalContent = insights.map(i => parseInt(i.totalContent) || 0);

			// Show followers first, then total content
			rows.push(
				['Followers', ...followers.map(v => this.kFormatter(v)), calculateChange(followers)],
				['Total Content', ...totalContent.map(String), calculateChange(totalContent)]
			);
		} else if (platform === 'Pinterest') {
			const followers = insights.map(i => parseInt(i.followers) || 0);
			const following = insights.map(i => parseInt(i.following) || 0);
			const totalContent = insights.map(i => parseInt(i.totalContent) || 0);
			rows.push(
				['Followers', ...followers.map(v => this.kFormatter(v)), calculateChange(followers)],
				['Following', ...following.map(v => this.kFormatter(v)), calculateChange(following)],
				['Total Pins', ...totalContent.map(String), calculateChange(totalContent)]
			);
		}


		return {
			Data: headers,
			Rows: rows,
			Growth: this.calculateGrowthText(insights[insights.length - 2], insights[insights.length - 1], platform),
		};
	}

	private buildOverviewTable(insights: any[], platform: string) {
		// Get month abbreviations (JAN, FEB, MAR)
		const monthAbbreviations = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		// Calculate percentage change
		const calculateChange = (values: number[]) => {
			if (values.length < 2) return 'N/A';
			const previous = values[values.length - 2]; // Previous month
			const current = values[values.length - 1];  // Current month
			if (previous === 0) {
				if (current === 0) return '0%';
				return `${(current * 100).toFixed(2)}%`; // e.g., 5 → 500.00%
			}
			const change = ((current - previous) / previous) * 100;
			return `${change.toFixed(2)}%`;
		};

		// Prepare table data
		const headers = ['Data', ...monthAbbreviations, 'Change %'];
		const rows = [];

		// Platform-specific metrics
		switch (platform) {
			case 'Instagram':
				const impressions = insights.map(i => parseInt(i.impressions) || 0);
				const reach = insights.map(i => parseInt(i.avgReachPerDay) || 0);
				rows.push(
					['Impressions', ...impressions.map(v => this.kFormatter(v)), calculateChange(impressions)],
					['Avg Reach/Day', ...reach.map(v => this.kFormatter(v)), calculateChange(reach)],
				);
				break;

			case 'Facebook':
				const fbImpressions = insights.map(i => parseInt(i.impressions) || 0);
				const pageViews = insights.map(i => parseInt(i.pageViews) || 0);
				rows.push(
					['Impressions', ...fbImpressions.map(v => this.kFormatter(v)), calculateChange(fbImpressions)],
					['Page Views', ...pageViews.map(v => this.kFormatter(v)), calculateChange(pageViews)],
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
					['Impressions', ...liImpressions.map(v => this.kFormatter(v)), calculateChange(liImpressions)],
					['Posts', ...posts.map(String), calculateChange(posts)],
				);
				break;

			case 'X':
				const xImpressions = insights.map(i => parseInt(i.impressions) || 0);
				const engagement = insights.map(i => parseFloat(i.engagement) || 0);
				const interactions = insights.map(i => parseInt(i.interactions) || 0);
				const xTotalContent = insights.map(i => parseInt(i.totalContent) || 0);
				rows.push(
					['Impressions', ...xImpressions.map(v => this.kFormatter(v)), calculateChange(xImpressions)],
					['Engagement', ...engagement.map(v => v.toFixed(2)), calculateChange(engagement)],
					['Interactions', ...interactions.map(v => this.kFormatter(v)), calculateChange(interactions)],
					['Total Content', ...xTotalContent.map(String), calculateChange(xTotalContent)]
				);
				break;

			case 'Threads':
				const threadsImpressions = insights.map(i => parseInt(i.impressions) || 0);
				const threadsEngagement = insights.map(i => parseFloat(i.engagement) || 0);
				const threadsInteractions = insights.map(i => parseInt(i.interactions) || 0);
				const threadsTotalContent = insights.map(i => parseInt(i.totalContent) || 0);
				rows.push(
					['Impressions', ...threadsImpressions.map(v => this.kFormatter(v)), calculateChange(threadsImpressions)],
					['Engagement', ...threadsEngagement.map(v => v.toFixed(2)), calculateChange(threadsEngagement)],
					['Interactions', ...threadsInteractions.map(v => this.kFormatter(v)), calculateChange(threadsInteractions)],
					['Total Content', ...threadsTotalContent.map(String), calculateChange(threadsTotalContent)]
				);
				break;

			case 'Pinterest':
				const pinterestImpressions = insights.map(i => parseInt(i.impressions) || 0);
				const pinterestSaves = insights.map(i => parseInt(i.saves) || 0);
				const pinterestClicks = insights.map(i => parseInt(i.clicks) || 0);
				const pinterestTotalContent = insights.map(i => parseInt(i.totalContent) || 0);
				rows.push(
					['Impressions', ...pinterestImpressions.map(v => this.kFormatter(v)), calculateChange(pinterestImpressions)],
					['Saves', ...pinterestSaves.map(v => this.kFormatter(v)), calculateChange(pinterestSaves)],
					['Clicks', ...pinterestClicks.map(v => this.kFormatter(v)), calculateChange(pinterestClicks)],
					['Total Pins', ...pinterestTotalContent.map(String), calculateChange(pinterestTotalContent)]
				);
				break;
		}

		return {
			Data: headers,
			Rows: rows,
		};
	}

	private calculateGrowthText(previousRecord: any, currentRecord: any, platform: string): string {
		if (!previousRecord || !currentRecord) return 'Insufficient data';

		let field = 'followers';
		if (platform === 'Facebook') field = 'likes';

		const change = (currentRecord[field] || 0) - (previousRecord[field] || 0);
		const changeText = `${change >= 0 ? '+' : ''}${change}`;

		if (platform === 'Facebook') return `${changeText} New Likes`;
		return `${changeText} New Followers`;
	}

	// Add these methods to the MonthlyReportService class in monthly-report.service.ts

	// Pinterest Methods
	async getPinterestCommunityReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._pinterestInsightsRepository.model.pinterestPostPerformance.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for each month to calculate totals
				const monthData = await this._pinterestInsightsRepository.model.pinterestPostPerformance.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthData.length > 0) {
					// Get latest value for followers (last data point)
					const lastDataPoint = monthData[monthData.length - 1];
					
					// Calculate monthly totals for other metrics
					const monthlyTotals = {
						totalContent: Math.abs(monthData.reduce((sum, item) => sum + (item.totalContent || 0), 0))
					};
					
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						followers: lastDataPoint.followers || 0,  // Latest value
						following: lastDataPoint.following || 0,  // Latest value
						totalContent: monthlyTotals.totalContent,  // Monthly total
						totalPins: monthlyTotals.totalContent  // Use totalContent as totalPins
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						followers: 0,
						following: 0,
						totalContent: 0,
						totalPins: 0
					});
				}
			}

			return {
				table: this.buildCommunityTable(allMonthsData, 'Pinterest'),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					followers: item.followers || 0,
					following: item.following || 0,
					totalContent: item.totalContent || 0,
					totalPins: item.totalContent || 0
				})),
				latestData: {
					followers: latestData.followers || 0,
					following: latestData.following || 0,
					totalContent: latestData.totalContent || 0,
					totalPins: latestData.totalContent || 0
				}
			};
		} catch (error) {
			console.error('Pinterest Community Error:', error);
			return null;
		}
	}

	async getPinterestOverviewReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._pinterestInsightsRepository.model.pinterestPostPerformance.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get data for current and previous 2 months with monthly totals
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for each month to calculate totals
				const monthData = await this._pinterestInsightsRepository.model.pinterestPostPerformance.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthData.length > 0) {
					// Calculate monthly totals
					const monthlyTotals = {
						impressions: Math.abs(monthData.reduce((sum, item) => sum + (item.impressions || 0), 0)),
						totalContent: Math.abs(monthData.reduce((sum, item) => sum + (item.totalContent || 0), 0))
					};
					
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						impressions: monthlyTotals.impressions,
						saves: 0,  // Not available in Pinterest data
						clicks: 0,  // Not available in Pinterest data
						totalContent: monthlyTotals.totalContent
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						impressions: 0,
						saves: 0,
						clicks: 0,
						totalContent: 0
					});
				}
			}

			return {
				table: this.buildOverviewTable(allMonthsData, 'Pinterest'),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					impressions: item.impressions || 0,
					saves: 0,  // Not available in Pinterest data
					clicks: 0,  // Not available in Pinterest data
					totalContent: item.totalContent || 0
				})),
				latestData: {
					impressions: latestData.impressions || 0,
					saves: 0,  // Not available in Pinterest data
					clicks: 0,  // Not available in Pinterest data
					totalContent: latestData.totalContent || 0
				}
			};
		} catch (error) {
			console.error('Pinterest Overview Error:', error);
			return null;
		}
	}

	// GBP Methods
	async getGBPPerformanceReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._gbpInsightsRepository.model.gbpInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get monthly totals for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for the month and sum them
				const monthlyDataPoints = await this._gbpInsightsRepository.model.gbpInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
				});

				if (monthlyDataPoints.length > 0) {
					// Calculate monthly totals
					const monthlyTotal = {
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						impressionsMaps: monthlyDataPoints.reduce((sum, item) => sum + (item.impressionsMaps || 0), 0),
						impressionsSearch: monthlyDataPoints.reduce((sum, item) => sum + (item.impressionsSearch || 0), 0),
						websiteClicks: monthlyDataPoints.reduce((sum, item) => sum + (item.websiteClicks || 0), 0),
						phoneClicks: monthlyDataPoints.reduce((sum, item) => sum + (item.phoneClicks || 0), 0),
						directionRequests: monthlyDataPoints.reduce((sum, item) => sum + (item.directionRequests || 0), 0)
					};
					allMonthsData.push(monthlyTotal);
				} else {
					// No data → create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						impressionsMaps: 0,
						impressionsSearch: 0,
						websiteClicks: 0,
						phoneClicks: 0,
						directionRequests: 0
					});
				}
			}

			// Calculate monthly totals
			const monthlyTotals = {
				impressionsMaps: dailyData.reduce((sum, item) => sum + (item.impressionsMaps || 0), 0),
				impressionsSearch: dailyData.reduce((sum, item) => sum + (item.impressionsSearch || 0), 0),
				websiteClicks: dailyData.reduce((sum, item) => sum + (item.websiteClicks || 0), 0),
				phoneClicks: dailyData.reduce((sum, item) => sum + (item.phoneClicks || 0), 0),
				directionRequests: dailyData.reduce((sum, item) => sum + (item.directionRequests || 0), 0)
			};

			return {
				table: this.buildGBPPerformanceTable(allMonthsData),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					maps: item.impressionsMaps || 0,
					search: item.impressionsSearch || 0,
					totalImpressions:
						(item.impressionsMaps || 0) +
						(item.impressionsSearch || 0)
				})),
				latestData: {
					impressionsMaps: latestData.impressionsMaps || 0,
					impressionsSearch: latestData.impressionsSearch || 0,
					websiteClicks: latestData.websiteClicks || 0,
					phoneClicks: latestData.phoneClicks || 0,
					directionRequests: latestData.directionRequests || 0
				},
				monthlyTotals: monthlyTotals
			};
		} catch (error) {
			console.error('GBP Performance Error:', error);
			return null;
		}
	}

	async getGBPEngagementReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._gbpInsightsRepository.model.gbpInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get monthly totals for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for the month and sum them
				const monthlyDataPoints = await this._gbpInsightsRepository.model.gbpInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
				});

				if (monthlyDataPoints.length > 0) {
					// Calculate monthly totals
					const monthlyTotal = {
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						websiteClicks: monthlyDataPoints.reduce((sum, item) => sum + (item.websiteClicks || 0), 0),
						phoneClicks: monthlyDataPoints.reduce((sum, item) => sum + (item.phoneClicks || 0), 0),
						directionRequests: monthlyDataPoints.reduce((sum, item) => sum + (item.directionRequests || 0), 0)
					};
					allMonthsData.push(monthlyTotal);
				} else {
					// No data → create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						websiteClicks: 0,
						phoneClicks: 0,
						directionRequests: 0
					});
				}
			}

			// Calculate monthly totals
			const monthlyTotals = {
				websiteClicks: dailyData.reduce((sum, item) => sum + (item.websiteClicks || 0), 0),
				phoneClicks: dailyData.reduce((sum, item) => sum + (item.phoneClicks || 0), 0),
				directionRequests: dailyData.reduce((sum, item) => sum + (item.directionRequests || 0), 0)
			};

			return {
				table: this.buildGBPEngagementTable(allMonthsData),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					website: item.websiteClicks || 0,
					phone: item.phoneClicks || 0,
					directions: item.directionRequests || 0,
					totalEngagement: (item.websiteClicks || 0) + (item.phoneClicks || 0) + (item.directionRequests || 0)
				})),
				latestData: {
					websiteClicks: latestData.websiteClicks || 0,
					phoneClicks: latestData.phoneClicks || 0,
					directionRequests: latestData.directionRequests || 0
				},
				monthlyTotals: monthlyTotals
			};
		} catch (error) {
			console.error('GBP Engagement Error:', error);
			return null;
		}
	}

	async getGBPReviewsReport(customerId: string, month: number, year: number) {
		try {
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._gbpInsightsRepository.model.gbpInsight.findMany({
				where: {
					customerId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (!dailyData.length) return null;

			// Get the latest data point for the requested month
			const latestData = dailyData[dailyData.length - 1];

			// For table data, get monthly totals for current and previous 2 months
			const allMonthsData = [];

			for (let i = 2; i >= 0; i--) {
				const currentMonth = new Date(year, month - 1 - i, 1);
				const monthNum = currentMonth.getMonth() + 1;
				const yearNum = currentMonth.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				// Get all data points for the month to calculate totals
				const monthlyDataPoints = await this._gbpInsightsRepository.model.gbpInsight.findMany({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					orderBy: { createdAt: 'asc' },
				});

				if (monthlyDataPoints.length > 0) {
					// Calculate monthly totals
					const totalReviews = monthlyDataPoints.reduce((sum, item) => sum + (item.totalReviews || 0), 0);
					const avgRating = monthlyDataPoints.length > 0
						? monthlyDataPoints.reduce((sum, item) => sum + (item.avgRating || 0), 0) / monthlyDataPoints.length
						: 0;

					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month date for display
						avgRating: avgRating,
						totalReviews: totalReviews
					});
				} else {
					// If no data, create empty entry
					allMonthsData.push({
						createdAt: new Date(yearNum, monthNum - 1, 15),
						avgRating: 0,
						totalReviews: 0
					});
				}
			}

			// Calculate monthly totals/averages for current month
			const monthlyTotals = {
				avgRating: dailyData.length > 0
					? dailyData.reduce((sum, item) => sum + (item.avgRating || 0), 0) / dailyData.length
					: 0,
				totalReviews: dailyData.reduce((sum, item) => sum + (item.totalReviews || 0), 0)
			};

			// Merge duplicate entries by date - sum up reviews and average ratings
			const dailyDataMap = new Map();

			for (const item of dailyData) {
				const dateKey = format(new Date(item.createdAt), 'yyyy-MM-dd');

				if (dailyDataMap.has(dateKey)) {
					// If date exists, merge the data
					const existing = dailyDataMap.get(dateKey);
					existing.reviews += (item.totalReviews || 0);
					existing.ratingSum += (item.avgRating || 0) * (item.totalReviews || 1);
					existing.ratingCount += (item.totalReviews || 1);
					existing.count += 1;
				} else {
					// First entry for this date
					dailyDataMap.set(dateKey, {
						date: item.createdAt,
						reviews: item.totalReviews || 0,
						ratingSum: (item.avgRating || 0) * (item.totalReviews || 1),
						ratingCount: item.totalReviews || 1,
						count: 1
					});
				}
			}

			// Convert map back to array with calculated averages
			const uniqueDailyData = Array.from(dailyDataMap.values()).map(item => ({
				createdAt: item.date,
				avgRating: item.ratingCount > 0 ? item.ratingSum / item.ratingCount : 0,
				totalReviews: item.reviews
			}));

			return {
				table: this.buildGBPReviewsTable(allMonthsData),
				chart: uniqueDailyData.map(item => ({
					date: item.createdAt,
					rating: item.avgRating || 0,
					reviews: item.totalReviews || 0
				})),
				latestData: {
					avgRating: monthlyTotals.avgRating,
					totalReviews: monthlyTotals.totalReviews
				},
				monthlyTotals: monthlyTotals
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
			const first = values[values.length - 2]; // May value
			const last = values[values.length - 1];  // June value
			if (first === 0) {
				if (last === 0) return '0%';
				return `${last * 100}%`; // e.g., 5 → 500%
			}
			const change = ((last - first) / first) * 100;
			return `${change.toFixed(2)}%`;
		};


		const headers = ['Data', ...months, 'Change %'];
		const rows = [];

		const mapsImpressions = insights.map(i => parseInt(i.impressionsMaps) || 0);
		const searchImpressions = insights.map(i => parseInt(i.impressionsSearch) || 0);
		const totalImpressions = insights.map((_, i) => mapsImpressions[i] + searchImpressions[i]);

		rows.push(
			['Google maps', ...mapsImpressions.map(v => this.kFormatter(v)), calculateChange(mapsImpressions)],
			['Google search', ...searchImpressions.map(v => this.kFormatter(v)), calculateChange(searchImpressions)],
			['Total', ...totalImpressions.map(v => this.kFormatter(v)), calculateChange(totalImpressions)]
		);

		return {
			Data: headers,
			Rows: rows
		};
	}

	private buildGBPEngagementTable(insights: any[]) {
		const months = insights.map(i => format(new Date(i.createdAt), 'MMM').toUpperCase());

		const calculateChange = (values: number[]) => {
			if (values.length < 2) return '0%';
			const first = values[values.length - 2]; // second last value (May)
			const last = values[values.length - 1];
			if (first === 0) {
				if (last === 0) return '0%';
				return `${last * 100}%`; // e.g., 5 → 500%
			}
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
			const first = values[values.length - 2]; // second last value (May)
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
			const { startDate, endDate } = this.getMonthDateRange(month, year);

			// Get daily data for the requested month
			const dailyData = await this._websitePerformanceRepo.model.websitePerformance.findMany({
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
					pageViews: true,
					visits: true,
					visitors: true
				}
			});

			if (!dailyData.length) return null;

			// Get data for current and previous 2 months for table
			const monthlyData = [];
			for (let i = 2; i >= 0; i--) {
				const date = new Date(year, month - 1 - i, 1);
				const monthNum = date.getMonth() + 1;
				const yearNum = date.getFullYear();
				const monthRange = this.getMonthDateRange(monthNum, yearNum);

				const monthlyStats = await this._websitePerformanceRepo.model.websitePerformance.aggregate({
					where: {
						customerId,
						createdAt: {
							gte: monthRange.startDate,
							lte: monthRange.endDate
						},
					},
					_sum: {
						pageViews: true,
						visits: true,
						visitors: true
					},
					_avg: {
						pageViews: true,
						visits: true,
						visitors: true
					}
				});

				monthlyData.push({
					createdAt: new Date(yearNum, monthNum - 1, 15), // Mid-month for display
					pageViews: monthlyStats._sum.pageViews || 0,
					visits: monthlyStats._sum.visits || 0,
					visitors: monthlyStats._sum.visitors || 0,
					avgPageViews: monthlyStats._avg.pageViews || 0,
					avgVisits: monthlyStats._avg.visits || 0,
					avgVisitors: monthlyStats._avg.visitors || 0
				});
			}

			return {
				table: this.buildWebsitePerformanceTable(monthlyData),
				chart: dailyData.map(item => ({
					date: item.createdAt,
					pageViews: item.pageViews || 0,
					visits: item.visits || 0,
					visitors: item.visitors || 0
				})),
				summary: monthlyData[monthlyData.length - 1] // Latest month data
			};
		} catch (error) {
			console.error('Website Performance Error:', error);
			return null;
		}
	}


	// Helper function to get full country name from country code
	private getCountryName(countryCode: string): string {
		try {
			// Use Intl.DisplayNames API to get country name in English
			const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
			const countryName = regionNames.of(countryCode.toUpperCase());
			return countryName || countryCode; // Fallback to code if name not found
		} catch {
			// Fallback to country code if API not supported or error
			return countryCode;
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
				if (prev === 0) {
					if (curr === 0) return '0%';
					return `${curr * 100}%`; // e.g., 5 → 500%
				}
				const change = ((curr - prev) / prev) * 100;
				return `${change.toFixed(2)}%`;
			};

			const rows = sorted.map(([country, visitors]) => [
				this.getCountryName(country), // Convert country code to full name
				...visitors.map(String),
				calculateChange(visitors)
			]);

			// 5. Chart data for May (keep country codes for chart as they'll be converted elsewhere)
			const totalMay = sorted.reduce((sum, [, v]) => sum + (v[2] || 0), 0);
			const chart = sorted.map(([country, v]) => ({
				country, // Keep country code here as it's converted in generateWebsiteLocationsChart
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
			if (values.length < 2) return '0%';
			const previous = values[values.length - 2] || 0; // Previous month
			const current = values[values.length - 1] || 0;  // Current month
			if (previous === 0) {
				if (current === 0) return '0%';
				return `${current * 100}%`; // e.g., 5 → 500%
			}
			const change = ((current - previous) / previous) * 100;
			return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
		};

		const headers = ['Metric', ...months, 'Change %'];
		const rows = [];

		const pageViews = insights.map(i => i.pageViews);
		const visits = insights.map(i => i.visits);
		const visitors = insights.map(i => i.visitors);

		rows.push(
			['Page Views', ...pageViews.map(v => v.toLocaleString()), calculateChange(pageViews)],
			['Visits', ...visits.map(v => v.toLocaleString()), calculateChange(visits)],
			['Visitors', ...visitors.map(v => v.toLocaleString()), calculateChange(visitors)]
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
		return num >= 1000 ? `${(num / 1000).toFixed(2)}k` : num.toString();
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
				name: true,
				brandLogo: true
			},
		});
		return {
			name: customer?.name || `Customer (${customerId.slice(0, 8)}...)`,
			brandLogo: customer?.brandLogo || null

		};
	}
}