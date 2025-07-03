// import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
// import { Response } from 'express';
// import { MonthlyReportService } from '../../services/report/monthly-report.service';
// import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';
// import * as fs from 'fs';
// import * as path from 'path';
// import * as pdf from 'html-pdf';
// import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
// import { ChartConfiguration } from 'chart.js';

// interface ChartData {
//     title: string;
//     image: string | null;
// }

// interface TableData {
//     title: string;
//     headers: string[];
//     rows: string[][];
//     growthText?: string;
// }

// interface PlatformReport {
//     name: string;
//     tables: TableData[];
//     charts: ChartData[];
// }

// @Controller('report-download')
// export class ReportDownloadController {
//     private readonly chartJSNodeCanvas: ChartJSNodeCanvas;

//     constructor(private readonly reportService: MonthlyReportService) {
//         this.chartJSNodeCanvas = new ChartJSNodeCanvas({
//             width: 800,
//             height: 400,
//             backgroundColour: 'white',
//         });
//     }

//     @Get('combined')
//     async downloadCombinedReport(
//         @Query('customerId') customerId: string,
//         @Query('month') month: string,
//         @Query('year') year: string,
//         @Query('instagram') instagram: string,
//         @Query('youtube') youtube: string,
//         @Query('facebook') facebook: string,
//         @Query('linkedin') linkedin: string,
//         @Query('x') x: string,
//         @Res() res: Response
//     ) {
//         try {
//             if (!customerId) throw new BadRequestException('customerId is required');
//             if (!month || !year) throw new BadRequestException('Month and year are required');

//             const monthNum = parseInt(month, 10);
//             const yearNum = parseInt(year, 10);

//             const reportDate = new Date(yearNum, monthNum - 1, 1);
//             if (!isValid(reportDate)) {
//                 throw new BadRequestException('Invalid month/year combination');
//             }

//             const currentMonthStart = startOfMonth(reportDate);
//             const currentMonthEnd = endOfMonth(reportDate);

//             const platforms = {
//                 instagram: instagram === 'true',
//                 youtube: youtube === 'true',
//                 facebook: facebook === 'true',
//                 linkedin: linkedin === 'true',
//                 x: x === 'true'
//             };

//             const platformReports: PlatformReport[] = [];

//             if (platforms.instagram) {
//                 const instagramReport = await this.processPlatform(
//                     'instagram',
//                     customerId,
//                     monthNum,
//                     yearNum,
//                     [
//                         { type: 'community', serviceMethod: 'getInstagramCommunityReport' },
//                         { type: 'overview', serviceMethod: 'getInstagramOverviewReport' }
//                     ],
//                     [
//                         { type: 'community', generator: this.generateCommunityChartForMonth.bind(this) },
//                         { type: 'followers', generator: this.generateFollowersChartForMonth.bind(this) },
//                         { type: 'impressions', generator: this.generateImpressionsChartForMonth.bind(this) }
//                     ]
//                 );
//                 if (instagramReport) platformReports.push(instagramReport);
//             }

//             // ... [keep other platform processing the same as in your original file]

//             // Process YouTube
//             if (platforms.youtube) {
//                 const youtubeReport = await this.processPlatform(
//                     'youtube',
//                     customerId,
//                     monthNum,
//                     yearNum,
//                     [
//                         { type: 'overview', serviceMethod: 'getYoutubeOverviewReport' }
//                     ],
//                     [
//                         { type: 'subscribers', generator: this.generateSubscribersChartForMonth.bind(this) },
//                         { type: 'views', generator: this.generateViewsChartForMonth.bind(this) }
//                     ]
//                 );
//                 if (youtubeReport) platformReports.push(youtubeReport);
//             }

//             // Process Facebook
//             if (platforms.facebook) {
//                 const facebookReport = await this.processPlatform(
//                     'facebook',
//                     customerId,
//                     monthNum,
//                     yearNum,
//                     [
//                         { type: 'community', serviceMethod: 'getFacebookCommunityReport' },
//                         { type: 'overview', serviceMethod: 'getFacebookOverviewReport' }
//                     ],
//                     [
//                         { type: 'likes', generator: this.generateFacebookLikesChartForMonth.bind(this) },
//                         { type: 'impressions', generator: this.generateFacebookImpressionsChartForMonth.bind(this) }
//                     ]
//                 );
//                 if (facebookReport) platformReports.push(facebookReport);
//             }

//             // Process LinkedIn
//             if (platforms.linkedin) {
//                 const linkedinReport = await this.processPlatform(
//                     'linkedin',
//                     customerId,
//                     monthNum,
//                     yearNum,
//                     [
//                         { type: 'community', serviceMethod: 'getLinkedInCommunityReport' },
//                         { type: 'overview', serviceMethod: 'getLinkedInOverviewReport' }
//                     ],
//                     [
//                         { type: 'followers', generator: this.generateLinkedInFollowersChartForMonth.bind(this) },
//                         { type: 'impressions', generator: this.generateLinkedInImpressionsChartForMonth.bind(this) }
//                     ]
//                 );
//                 if (linkedinReport) platformReports.push(linkedinReport);
//             }

//             // Process X (Twitter)
//             if (platforms.x) {
//                 const xReport = await this.processPlatform(
//                     'x',
//                     customerId,
//                     monthNum,
//                     yearNum,
//                     [
//                         { type: 'community', serviceMethod: 'getXCommunityReport' },
//                         { type: 'overview', serviceMethod: 'getXOverviewReport' }
//                     ],
//                     [
//                         { type: 'followers', generator: this.generateXFollowersChartForMonth.bind(this) },
//                         { type: 'impressions', generator: this.generateXImpressionsChartForMonth.bind(this) }
//                     ]
//                 );
//                 if (xReport) platformReports.push(xReport);
//             }

//             // Debug logging
//             console.log('Generated platform reports:', {
//                 customerId,
//                 month: `${monthNum}/${yearNum}`,
//                 platformsEnabled: platforms,
//                 reportsFound: platformReports.map(r => ({
//                     platform: r.name,
//                     tables: r.tables.length,
//                     charts: r.charts.length
//                 }))
//             });

//             const logoPath = path.join(__dirname, 'assets', 'upstrapp-logo.png');
//             const logoBase64 = fs.readFileSync(logoPath, 'base64');
//             const logoDataUri = `data:image/png;base64,${logoBase64}`;

//             const monthDisplay = format(currentMonthStart, 'MMMM yyyy');

//             if (platformReports.length === 0) {
//                 console.warn(`No data found for customer ${customerId} in ${monthDisplay}`);
//             }

//             const html = platformReports.length > 0
//                 ? this.generateCombinedReportHtml({
//                     platformReports,
//                     logoDataUri,
//                     month: monthDisplay
//                 })
//                 : this.generateNoDataHtml(logoDataUri, monthDisplay);

//             this.generateAndSendPdf(res, html, 'monthly-report', customerId, `${month}-${year}`);

//         } catch (error) {
//             console.error('Error in downloadCombinedReport:', error);
//             this.handleErrorResponse(error, res);
//         }
//     }

//     private async processPlatform(
//         platform: string,
//         customerId: string,
//         month: number,
//         year: number,
//         reports: { type: string; serviceMethod: string }[],
//         charts: { type: string; generator: Function }[]
//     ): Promise<PlatformReport | null> {
//         try {
//             console.log(`Fetching ${platform} data for ${customerId}, ${month}/${year}`);

//             const tables: TableData[] = [];
//             let rawData: any = null;

//             for (const report of reports) {
//                 try {
//                     const data = await this.reportService[report.serviceMethod](customerId, month, year);
//                     if (data) {
//                         rawData = data;
//                         const table = this.createTable(
//                             `${report.type.charAt(0).toUpperCase() + report.type.slice(1)}`,
//                             data.table
//                         );
//                         if (table) tables.push(table);
//                     }
//                 } catch (error) {
//                     console.error(`Error processing ${platform} ${report.type} report:`, error);
//                 }
//             }

//             let validCharts: ChartData[] = [];
//             if (tables.length === 0 && rawData?.chart) {
//                 console.log(`No tables but attempting charts from raw data for ${platform}`);
//                 const chartResults = await Promise.all(
//                     charts.map(chart => chart.generator(customerId, month, year, platform, rawData))
//                 );
//                 validCharts = chartResults.filter(chart => chart?.image) as ChartData[];
//             } else if (tables.length > 0) {
//                 const chartResults = await Promise.all(
//                     charts.map(chart => chart.generator(customerId, month, year, platform))
//                 );
//                 validCharts = chartResults.filter(chart => chart?.image) as ChartData[];
//             }

//             if (tables.length > 0 || validCharts.length > 0) {
//                 return {
//                     name: this.getPlatformDisplayName(platform),
//                     tables,
//                     charts: validCharts
//                 };
//             }

//             console.log(`No valid data found for ${platform}`);
//             return null;
//         } catch (error) {
//             console.error(`Error processing ${platform} platform:`, error);
//             return null;
//         }
//     }

//     // ... [keep all other methods the same as in your original file]

//     private getPlatformDisplayName(platform: string): string {
//         const platformNames: Record<string, string> = {
//             instagram: 'Instagram',
//             youtube: 'YouTube',
//             facebook: 'Facebook',
//             linkedin: 'LinkedIn',
//             x: 'X (Twitter)'
//         };
//         return platformNames[platform.toLowerCase()] || platform;
//     }

//     private createTable(title: string, tableData: any): TableData | null {
//         if (!tableData || !tableData.Data || tableData.Data.length === 0) {
//             return null;
//         }

//         const headers = ['Metric', ...tableData.Data];
//         const rows = [];

//         // Helper to safely add rows
//         const addRowIfValid = (label: string, values: any[]) => {
//             if (values && values.length > 0 && values.some(v => v && v !== '0')) {
//                 rows.push([label, ...values.map(v => v || '0')]);
//             }
//         };

//         addRowIfValid('Followers', tableData.Followers);
//         addRowIfValid('Following', tableData.Following);
//         addRowIfValid('Likes', tableData.Likes);
//         addRowIfValid('Impressions', tableData.Impressions);
//         addRowIfValid('Subscribers', tableData.Subscribers);
//         addRowIfValid('Total Views', tableData.TotalViews);
//         addRowIfValid('Total Content', tableData.TotalContent);
//         addRowIfValid('Page Views', tableData.PageViews);
//         addRowIfValid('Engagement', tableData.Engagement);
//         addRowIfValid('Interactions', tableData.Interactions);
//         addRowIfValid('Paid Followers', tableData['Paid Followers']);
//         addRowIfValid('Posts', tableData.Posts);

//         if (rows.length === 0) {
//             return null;
//         }

//         return {
//             title,
//             headers,
//             rows,
//             growthText: tableData.Growth || ''
//         };
//     }

//     private async generateCommunityChartForMonth(
//         customerId: string,
//         month: number,
//         year: number,
//         platform: string,
//         preloadedData?: any // Allow passing preloaded data
//     ): Promise<ChartData | null> {
//         try {
//             let report = preloadedData;
//             if (!report) {
//                 if (platform === 'instagram') {
//                     report = await this.reportService.getInstagramCommunityReport(customerId, month, year);
//                 } else if (platform === 'facebook') {
//                     report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
//                 } else if (platform === 'x') {
//                     report = await this.reportService.getXCommunityReport(customerId, month, year);
//                 }

//                 if (!report?.chart?.length) {
//                     console.log(`No chart data for ${platform} community report`);
//                     return null;
//                 }


//                 // Process chart data with fallbacks
//                 const validChartData = report.chart.map(item => ({
//                     date: item.date && isValid(new Date(item.date))
//                         ? new Date(item.date)
//                         : new Date(year, month - 1, 15), // Mid-month fallback
//                     followers: item.followers || 0,
//                     following: item.following || 0,
//                     likes: item.likes || 0
//                 }));


//                 // Ensure we have at least 2 data points for meaningful charts
//                 if (validChartData.length < 2) {
//                     console.log(`Insufficient data points (${validChartData.length}) for ${platform} community chart`);
//                     return null;
//                 }

//                 const configuration: ChartConfiguration<'bar'> = {
//                     type: 'bar',
//                     data: {
//                         labels: validChartData.map(item => format(item.date, 'MMM d')),
//                         datasets: [
//                             {
//                                 label: 'Followers',
//                                 data: validChartData.map(item => item.followers),
//                                 backgroundColor: 'rgba(54, 162, 235, 0.6)',
//                                 borderColor: 'rgba(54, 162, 235, 1)',
//                                 borderWidth: 1
//                             },
//                             {
//                                 label: platform === 'facebook' ? 'Likes' : 'Following',
//                                 data: validChartData.map(item => platform === 'facebook' ? item.likes : item.following),
//                                 backgroundColor: 'rgba(255, 159, 64, 0.6)',
//                                 borderColor: 'rgba(255, 159, 64, 1)',
//                                 borderWidth: 1
//                             }
//                         ]
//                     },
//                     options: {
//                         responsive: true,
//                         plugins: {
//                             legend: { position: 'top' },
//                             title: {
//                                 display: true,
//                                 text: `${this.getPlatformDisplayName(platform)} Community`
//                             }
//                         }
//                     }
//                 };

//                 const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//                 return {
//                     title: `${this.getPlatformDisplayName(platform)} Community`,
//                     image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//                 };
//             }
//         } catch (error) {
//             console.error(`Error generating ${platform} community chart:`, error);
//             return null;
//         }
//     }

//     // Similar implementations for other chart generation methods:
//     // - generateFollowersChartForMonth
//     private async generateFollowersChartForMonth(customerId: string, month: number, year: number, platform: string): Promise<ChartData> {
//         try {
//             let report;
//             if (platform === 'instagram') {
//                 report = await this.reportService.getInstagramCommunityReport(customerId, month, year);
//             } else if (platform === 'facebook') {
//                 report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
//             } else if (platform === 'x') {
//                 report = await this.reportService.getXCommunityReport(customerId, month, year);
//             } else if (platform === 'linkedin') {
//                 report = await this.reportService.getLinkedInCommunityReport(customerId, month, year);
//             }

//             if (!report?.chart?.length) return { title: `${platform} Followers`, image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: platform === 'facebook' ? 'Likes' : 'Followers',
//                         data: report.chart.map(item => platform === 'facebook' ? item.likes : item.followers),
//                         backgroundColor: 'rgba(153, 102, 255, 0.2)',
//                         borderColor: 'rgba(153, 102, 255, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Followers`
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Followers`,
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error(`Error generating ${platform} followers chart:`, error);
//             return { title: `${platform} Followers`, image: null };
//         }
//     }
//     // - generateImpressionsChartForMonth

//     private async generateImpressionsChartForMonth(customerId: string, month: number, year: number, platform: string): Promise<ChartData> {
//         try {
//             let report;
//             if (platform === 'instagram') {
//                 report = await this.reportService.getInstagramOverviewReport(customerId, month, year);
//             } else if (platform === 'facebook') {
//                 report = await this.reportService.getFacebookOverviewReport(customerId, month, year);
//             } else if (platform === 'x') {
//                 report = await this.reportService.getXOverviewReport(customerId, month, year);
//             } else if (platform === 'linkedin') {
//                 report = await this.reportService.getLinkedInOverviewReport(customerId, month, year);
//             }

//             if (!report?.chart?.length) return { title: `${platform} Impressions`, image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Impressions',
//                         data: report.chart.map(item => item.impressions),
//                         backgroundColor: 'rgba(75, 192, 192, 0.2)',
//                         borderColor: 'rgba(75, 192, 192, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Impressions`
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Impressions`,
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error(`Error generating ${platform} impressions chart:`, error);
//             return { title: `${platform} Impressions`, image: null };
//         }
//     }

//     // - generateSubscribersChartForMonth
//     private async generateSubscribersChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getYoutubeOverviewReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'YouTube Subscribers', image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Subscribers',
//                         data: report.chart.map(item => item.subscribers),
//                         backgroundColor: 'rgba(255, 99, 132, 0.2)',
//                         borderColor: 'rgba(255, 99, 132, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'YouTube Subscribers'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'YouTube Subscribers',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating YouTube subscribers chart:', error);
//             return { title: 'YouTube Subscribers', image: null };
//         }
//     }

//     private async generateViewsChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getYoutubeOverviewReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'YouTube Views', image: null };

//             const configuration: ChartConfiguration<'bar'> = {
//                 type: 'bar',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Views',
//                         data: report.chart.map(item => item.totalViews),
//                         backgroundColor: 'rgba(54, 162, 235, 0.6)',
//                         borderColor: 'rgba(54, 162, 235, 1)',
//                         borderWidth: 1
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'YouTube Views'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'YouTube Views',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating YouTube views chart:', error);
//             return { title: 'YouTube Views', image: null };
//         }
//     }

//     private async generateFacebookLikesChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'Facebook Likes', image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Likes',
//                         data: report.chart.map(item => item.likes),
//                         backgroundColor: 'rgba(59, 89, 152, 0.2)',
//                         borderColor: 'rgba(59, 89, 152, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'Facebook Likes'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'Facebook Likes',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating Facebook likes chart:', error);
//             return { title: 'Facebook Likes', image: null };
//         }
//     }

//     private async generateFacebookImpressionsChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getFacebookOverviewReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'Facebook Impressions', image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Impressions',
//                         data: report.chart.map(item => item.impressions),
//                         backgroundColor: 'rgba(59, 89, 152, 0.2)',
//                         borderColor: 'rgba(59, 89, 152, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'Facebook Impressions'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'Facebook Impressions',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating Facebook impressions chart:', error);
//             return { title: 'Facebook Impressions', image: null };
//         }
//     }

//     private async generateLinkedInFollowersChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getLinkedInCommunityReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'LinkedIn Followers', image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Followers',
//                         data: report.chart.map(item => item.followers),
//                         backgroundColor: 'rgba(0, 119, 181, 0.2)',
//                         borderColor: 'rgba(0, 119, 181, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'LinkedIn Followers'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'LinkedIn Followers',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating LinkedIn followers chart:', error);
//             return { title: 'LinkedIn Followers', image: null };
//         }
//     }

//     private async generateXImpressionsChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getXOverviewReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'X Impressions', image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Impressions',
//                         data: report.chart.map(item => item.impressions),
//                         backgroundColor: 'rgba(29, 161, 242, 0.2)',
//                         borderColor: 'rgba(29, 161, 242, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'X Impressions'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'X Impressions',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating X impressions chart:', error);
//             return { title: 'X Impressions', image: null };
//         }
//     }

//     private async generateXFollowersChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getXCommunityReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'X Followers', image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Followers',
//                         data: report.chart.map(item => item.followers),
//                         backgroundColor: 'rgba(29, 161, 242, 0.2)',
//                         borderColor: 'rgba(29, 161, 242, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'X Followers'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'X Followers',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating X followers chart:', error);
//             return { title: 'X Followers', image: null };
//         }
//     }

//     private async generateLinkedInImpressionsChartForMonth(customerId: string, month: number, year: number): Promise<ChartData> {
//         try {
//             const report = await this.reportService.getLinkedInOverviewReport(customerId, month, year);
//             if (!report?.chart?.length) return { title: 'LinkedIn Impressions', image: null };

//             const configuration: ChartConfiguration<'line'> = {
//                 type: 'line',
//                 data: {
//                     labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
//                     datasets: [{
//                         label: 'Impressions',
//                         data: report.chart.map(item => item.impressions),
//                         backgroundColor: 'rgba(0, 119, 181, 0.2)',
//                         borderColor: 'rgba(0, 119, 181, 1)',
//                         borderWidth: 2,
//                         tension: 0.1,
//                         fill: false
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: { display: false },
//                         title: {
//                             display: true,
//                             text: 'LinkedIn Impressions'
//                         }
//                     }
//                 }
//             };

//             const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
//             return {
//                 title: 'LinkedIn Impressions',
//                 image: `data:image/png;base64,${imageBuffer.toString('base64')}`
//             };
//         } catch (error) {
//             console.error('Error generating LinkedIn impressions chart:', error);
//             return { title: 'LinkedIn Impressions', image: null };
//         }
//     }

//     // - generateViewsChartForMonth
//     // - generateFacebookLikesChartForMonth
//     // - generateFacebookImpressionsChartForMonth
//     // - generateLinkedInFollowersChartForMonth
//     // - generateLinkedInImpressionsChartForMonth
//     // - generateXFollowersChartForMonth
//     // - generateXImpressionsChartForMonth

//     private generateCombinedReportHtml(options: {
//         platformReports: PlatformReport[];
//         logoDataUri: string;
//         month: string;
//     }): string {
//         const currentDate = format(new Date(), 'MMM d, yyyy');

//         return `<!DOCTYPE html>
// <html>
// <head>
//     <style>
//         @page {
//             margin: 0;
//         }
//         body {
//             margin: 0;
//             padding: 20px;
//             font-family: Arial, sans-serif;
//             color: #333;
//         }
//         .logo-container {
//             margin: 0;
//             padding: 0;
//         }
//         .logo {
//             width: 100px;
//             height: auto;
//             display: block;
//             margin-top: 0;
//             margin-bottom: 10px;
//         }
//         .header {
//             text-align: center;
//             margin-bottom: 30px;
//         }
//         .header h1 {
//             font-size: 24px;
//             margin: 0;
//         }
//         .header p {
//             margin: 5px 0 0;
//             color: #666;
//         }
//         .platform-section {
//             margin-bottom: 40px;
//             page-break-after: always;
//         }
//         .platform-title {
//             font-size: 20px;
//             font-weight: bold;
//             margin-bottom: 15px;
//             color: #2c3e50;
//             border-bottom: 2px solid #eee;
//             padding-bottom: 5px;
//         }
//         .section {
//             margin-bottom: 30px;
//         }
//         .section-title {
//             font-size: 18px;
//             font-weight: bold;
//             margin-bottom: 15px;
//             color: #34495e;
//         }
//         .chart-container {
//             margin: 30px 0;
//             height: 300px;
//             page-break-inside: avoid;
//         }
//         .chart-title {
//             text-align: center;
//             font-size: 16px;
//             margin-bottom: 10px;
//             color: #34495e;
//         }
//         .chart-img {
//             width: 100%;
//             height: 100%;
//             object-fit: contain;
//         }
//         table {
//             width: 100%;
//             border-collapse: collapse;
//             margin-bottom: 20px;
//             page-break-inside: avoid;
//         }
//         th, td {
//             padding: 10px;
//             text-align: left;
//             border-bottom: 1px solid #ddd;
//         }
//         th {
//             font-weight: bold;
//             background-color: #f8f9fa;
//         }
//         tr:nth-child(even) {
//             background-color: #f8f9fa;
//         }
//         .growth-text {
//             font-style: italic;
//             color: #7f8c8d;
//             margin-top: -15px;
//             margin-bottom: 20px;
//         }
//         .footer {
//             text-align: center;
//             margin-top: 30px;
//             color: #95a5a6;
//             font-size: 12px;
//         }
//     </style>
// </head>
// <body>
//     <div class="logo-container">
//         <img src="${options.logoDataUri}" class="logo" alt="Company Logo" />
//     </div>

//     <div class="header">
//         <h1>Social Media Analytics Report</h1>
//         <p>For ${options.month} | Generated on ${currentDate}</p>
//     </div>

//     ${options.platformReports.map(platform => `
//         <div class="platform-section">
//             <div class="platform-title">${platform.name}</div>

//             ${platform.tables.map(table => `
//                 <div class="section">
//                     <div class="section-title">${table.title}</div>
//                     <table>
//                         <thead>
//                             <tr>
//                                 ${table.headers.map(header => `<th>${header}</th>`).join('')}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             ${table.rows.map(row => `
//                                 <tr>
//                                     ${row.map(cell => `<td>${cell}</td>`).join('')}
//                                 </tr>
//                             `).join('')}
//                         </tbody>
//                     </table>
//                     ${table.growthText ? `<div class="growth-text">${table.growthText}</div>` : ''}
//                 </div>
//             `).join('')}

//             ${platform.charts.filter(chart => chart.image).map(chart => `
//                 <div class="chart-container">
//                     <div class="chart-title">${chart.title}</div>
//                     <img src="${chart.image}" class="chart-img" />
//                 </div>
//             `).join('')}
//         </div>
//     `).join('')}

//     <div class="footer">
//         <p>© ${new Date().getFullYear()} Upstrapp. All rights reserved.</p>
//     </div>
// </body>
// </html>`;
//     }

//     private generateNoDataHtml(logoDataUri: string, month: string): string {
//         return `<!DOCTYPE html>
// <html>
// <head>
//     <style>
//         @page {
//             margin: 0;
//         }
//         body {
//             margin: 0;
//             padding: 20px;
//             font-family: Arial, sans-serif;
//             color: #333;
//         }
//         .logo-container {
//             margin: 0;
//             padding: 0;
//         }
//         .logo {
//             width: 100px;
//             height: auto;
//             display: block;
//             margin-top: 0;
//             margin-bottom: 10px;
//         }
//         .header {
//             text-align: center;
//             margin-bottom: 30px;
//         }
//         .header h1 {
//             font-size: 24px;
//             margin: 0;
//         }
//         .header p {
//             margin: 5px 0 0;
//             color: #666;
//         }
//         .no-data-message {
//             text-align: center;
//             margin: 50px 0;
//             color: #7f8c8d;
//         }
//         .footer {
//             text-align: center;
//             margin-top: 30px;
//             color: #95a5a6;
//             font-size: 12px;
//         }
//     </style>
// </head>
// <body>
//     <div class="logo-container">
//         <img src="${logoDataUri}" class="logo" alt="Company Logo" />
//     </div>

//     <div class="header">
//         <h1>Social Media Analytics Report</h1>
//         <p>For ${month} | Generated on ${format(new Date(), 'MMM d, yyyy')}</p>
//     </div>

//     <div class="no-data-message">
//         <h2>No Data Available</h2>
//         <p>No social media data was found for the selected period.</p>
//     </div>

//     <div class="footer">
//         <p>© ${new Date().getFullYear()} Upstrapp. All rights reserved.</p>
//     </div>
// </body>
// </html>`;
//     }

//     private generateAndSendPdf(
//         res: Response,
//         html: string,
//         platform: string,
//         customerId: string,
//         period: string
//     ) {
//         const options: pdf.CreateOptions = {
//             format: 'A4',
//             border: {
//                 top: '0.5in',
//                 right: '0.3in',
//                 bottom: '0.5in',
//                 left: '0.3in'
//             }
//         };

//         pdf.create(html, options).toStream((err, stream) => {
//             if (err) {
//                 console.error('PDF generation error:', err);
//                 return res.status(500).send('Error generating PDF');
//             }

//             res.setHeader('Content-Type', 'application/pdf');
//             res.setHeader(
//                 'Content-Disposition',
//                 `attachment; filename=${platform}-${customerId}-${period}.pdf`
//             );
//             stream.pipe(res);
//         });
//     }

//     private handleErrorResponse(error: any, res: Response) {
//         if (error instanceof BadRequestException) {
//             res.status(400).send(error.message);
//         } else {
//             console.error('PDF Generation Error:', error);
//             res.status(500).send('Error generating report');
//         }
//     }

//     @Get('debug-instagram')
//     async debugInstagram(
//         @Query('customerId') customerId: string,
//         @Query('month') month: string,
//         @Query('year') year: string,
//         @Res() res: Response
//     ) {
//         try {
//             const monthNum = parseInt(month, 10);
//             const yearNum = parseInt(year, 10);

//             // 1. Verify service is being called correctly
//             console.log(`Debugging Instagram for ${customerId}, ${monthNum}/${yearNum}`);

//             // 2. Directly call service methods
//             const data = await this.reportService.getInstagramCommunityReport(customerId, monthNum, yearNum);

//             // 3. Return raw data for inspection
//             res.json({
//                 success: !!data,
//                 data,
//                 query: {
//                     customerId,
//                     month: monthNum,
//                     year: yearNum,
//                     monthString: `${yearNum}-${monthNum.toString().padStart(2, '0')}`
//                 }
//             });
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     }

// }


import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MonthlyReportService } from '../../services/report/monthly-report.service';
import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'html-pdf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

interface ChartData {
    title: string;
    image: string | null;
}

interface TableData {
    title: string;
    headers: string[];
    rows: string[][];
    growthText?: string;
}

interface PlatformReport {
    name: string;
    tables: TableData[];
    charts: ChartData[];
}

@Controller('report-download')
export class ReportDownloadController {
    private readonly chartJSNodeCanvas: ChartJSNodeCanvas;

    constructor(private readonly reportService: MonthlyReportService) {
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: 800,
            height: 400,
            backgroundColour: 'white',
        });
    }

    @Get('combined')
    async downloadCombinedReport(
        @Query('customerId') customerId: string,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('instagram') instagram: string,
        @Query('youtube') youtube: string,
        @Query('facebook') facebook: string,
        @Query('linkedin') linkedin: string,
        @Query('x') x: string,
        @Res() res: Response
    ) {
        try {
            if (!customerId) throw new BadRequestException('customerId is required');
            if (!month || !year) throw new BadRequestException('Month and year are required');

            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);

            const reportDate = new Date(yearNum, monthNum - 1, 1);
            if (!isValid(reportDate)) {
                throw new BadRequestException('Invalid month/year combination');
            }

            const currentMonthStart = startOfMonth(reportDate);
            const currentMonthEnd = endOfMonth(reportDate);

            const platforms = {
                instagram: instagram === 'true',
                youtube: youtube === 'true',
                facebook: facebook === 'true',
                linkedin: linkedin === 'true',
                x: x === 'true'
            };

            const platformReports: PlatformReport[] = [];

            if (platforms.instagram) {
                const instagramReport = await this.processPlatform(
                    'instagram',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'community', serviceMethod: 'getInstagramCommunityReport' },
                        { type: 'overview', serviceMethod: 'getInstagramOverviewReport' }
                    ],
                    [
                        { type: 'community', generator: this.generateCommunityChartForMonth.bind(this) },
                        { type: 'followers', generator: this.generateFollowersChartForMonth.bind(this) },
                        { type: 'impressions', generator: this.generateImpressionsChartForMonth.bind(this) }
                    ]
                );
                if (instagramReport) platformReports.push(instagramReport);
            }

            if (platforms.youtube) {
                const youtubeReport = await this.processPlatform(
                    'youtube',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'overview', serviceMethod: 'getYoutubeOverviewReport' }
                    ],
                    [
                        { type: 'subscribers', generator: this.generateSubscribersChartForMonth.bind(this) },
                        { type: 'views', generator: this.generateViewsChartForMonth.bind(this) }
                    ]
                );
                if (youtubeReport) platformReports.push(youtubeReport);
            }

            if (platforms.facebook) {
                const facebookReport = await this.processPlatform(
                    'facebook',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'community', serviceMethod: 'getFacebookCommunityReport' },
                        { type: 'overview', serviceMethod: 'getFacebookOverviewReport' }
                    ],
                    [
                        { type: 'likes', generator: this.generateFacebookLikesChartForMonth.bind(this) },
                        { type: 'impressions', generator: this.generateFacebookImpressionsChartForMonth.bind(this) }
                    ]
                );
                if (facebookReport) platformReports.push(facebookReport);
            }

            if (platforms.linkedin) {
                const linkedinReport = await this.processPlatform(
                    'linkedin',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'community', serviceMethod: 'getLinkedInCommunityReport' },
                        { type: 'overview', serviceMethod: 'getLinkedInOverviewReport' }
                    ],
                    [
                        { type: 'followers', generator: this.generateLinkedInFollowersChartForMonth.bind(this) },
                        { type: 'impressions', generator: this.generateLinkedInImpressionsChartForMonth.bind(this) }
                    ]
                );
                if (linkedinReport) platformReports.push(linkedinReport);
            }

            if (platforms.x) {
                const xReport = await this.processPlatform(
                    'x',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'community', serviceMethod: 'getXCommunityReport' },
                        { type: 'overview', serviceMethod: 'getXOverviewReport' }
                    ],
                    [
                        { type: 'followers', generator: this.generateXFollowersChartForMonth.bind(this) },
                        { type: 'impressions', generator: this.generateXImpressionsChartForMonth.bind(this) }
                    ]
                );
                if (xReport) platformReports.push(xReport);
            }

            console.log('Generated platform reports:', {
                customerId,
                month: `${monthNum}/${yearNum}`,
                platformsEnabled: platforms,
                reportsFound: platformReports.map(r => ({
                    platform: r.name,
                    tables: r.tables.length,
                    charts: r.charts.length
                }))
            });

            const logoPath = path.join(__dirname, 'assets', 'upstrapp-logo.png');
            const logoBase64 = fs.readFileSync(logoPath, 'base64');
            const logoDataUri = `data:image/png;base64,${logoBase64}`;

            const monthDisplay = format(currentMonthStart, 'MMMM yyyy');

            if (platformReports.length === 0) {
                console.warn(`No data found for customer ${customerId} in ${monthDisplay}`);
            }

            const html = platformReports.length > 0
                ? this.generateCombinedReportHtml({
                    platformReports,
                    logoDataUri,
                    month: monthDisplay
                })
                : this.generateNoDataHtml(logoDataUri, monthDisplay);

            this.generateAndSendPdf(res, html, 'monthly-report', customerId, `${month}-${year}`);

        } catch (error) {
            console.error('Error in downloadCombinedReport:', error);
            this.handleErrorResponse(error, res);
        }
    }

    private async processPlatform(
        platform: string,
        customerId: string,
        month: number,
        year: number,
        reports: { type: string; serviceMethod: string }[],
        charts: { type: string; generator: Function }[]
    ): Promise<PlatformReport | null> {
        try {
            console.log(`Fetching ${platform} data for ${customerId}, ${month}/${year}`);

            const tables: TableData[] = [];
            let rawData: any = null;

            for (const report of reports) {
                try {
                    const data = await this.reportService[report.serviceMethod](customerId, month, year);
                    if (data) {
                        rawData = data;
                        const table = this.createTable(
                            `${report.type.charAt(0).toUpperCase() + report.type.slice(1)}`,
                            data.table
                        );
                        if (table) tables.push(table);
                    }
                } catch (error) {
                    console.error(`Error processing ${platform} ${report.type} report:`, error);
                }
            }

            let validCharts: ChartData[] = [];
            if (tables.length === 0 && rawData?.chart) {
                console.log(`No tables but attempting charts from raw data for ${platform}`);
                const chartResults = await Promise.all(
                    charts.map(chart => chart.generator(customerId, month, year, platform, rawData))
                );
                validCharts = chartResults.filter(chart => chart?.image) as ChartData[];
            } else if (tables.length > 0) {
                const chartResults = await Promise.all(
                    charts.map(chart => chart.generator(customerId, month, year, platform))
                );
                validCharts = chartResults.filter(chart => chart?.image) as ChartData[];
            }

            if (tables.length > 0 || validCharts.length > 0) {
                return {
                    name: this.getPlatformDisplayName(platform),
                    tables,
                    charts: validCharts
                };
            }

            console.log(`No valid data found for ${platform}`);
            return null;
        } catch (error) {
            console.error(`Error processing ${platform} platform:`, error);
            return null;
        }
    }

    private getPlatformDisplayName(platform: string): string {
        const platformNames: Record<string, string> = {
            instagram: 'Instagram',
            youtube: 'YouTube',
            facebook: 'Facebook',
            linkedin: 'LinkedIn',
            x: 'X (Twitter)'
        };
        return platformNames[platform.toLowerCase()] || platform;
    }

    private createTable(title: string, tableData: any): TableData | null {
        if (!tableData || !tableData.Data || tableData.Data.length === 0) {
            return null;
        }

        const headers = ['Data', ...tableData.Data];
        const rows = [];

        const addRowIfValid = (label: string, values: any[]) => {
            if (values && values.length > 0 && values.some(v => v && v !== '0')) {
                rows.push([label, ...values.map(v => v || '0')]);
            }
        };

        addRowIfValid('Followers', tableData.Followers);
        addRowIfValid('Following', tableData.Following);
        addRowIfValid('Likes', tableData.Likes);
        addRowIfValid('Impressions', tableData.Impressions);
        addRowIfValid('Subscribers', tableData.Subscribers);
        addRowIfValid('Total Views', tableData.TotalViews);
        addRowIfValid('Total Content', tableData.TotalContent);
        addRowIfValid('Page Views', tableData.PageViews);
        addRowIfValid('Engagement', tableData.Engagement);
        addRowIfValid('Interactions', tableData.Interactions);
        addRowIfValid('Paid Followers', tableData['Paid Followers']);
        addRowIfValid('Posts', tableData.Posts);

        if (rows.length === 0) {
            return null;
        }

        return {
            title,
            headers,
            rows,
            growthText: tableData.Growth || ''
        };
    }

    private async generateCommunityChartForMonth(
        customerId: string,
        month: number,
        year: number,
        platform: string,
        preloadedData?: any
    ): Promise<ChartData | null> {
        try {
            let report = preloadedData;
            if (!report) {
                if (platform === 'instagram') {
                    report = await this.reportService.getInstagramCommunityReport(customerId, month, year);
                } else if (platform === 'facebook') {
                    report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
                } else if (platform === 'x') {
                    report = await this.reportService.getXCommunityReport(customerId, month, year);
                }

                if (!report?.chart?.length) {
                    console.log(`No chart data for ${platform} community report`);
                    return null;
                }
            }

            const validChartData = report.chart.map(item => ({
                date: item.date && isValid(new Date(item.date))
                    ? new Date(item.date)
                    : new Date(year, month - 1, 15),
                followers: item.followers || 0,
                following: item.following || 0,
                likes: item.likes || 0
            }));

            if (validChartData.length < 2) {
                console.log(`Insufficient data points (${validChartData.length}) for ${platform} community chart`);
                return null;
            }

            const configuration: ChartConfiguration<'bar'> = {
                type: 'bar',
                data: {
                    labels: validChartData.map(item => format(item.date, 'MMM d')),
                    datasets: [
                        {
                            label: 'Followers',
                            data: validChartData.map(item => item.followers),
                            backgroundColor: 'rgba(54, 162, 235, 0.6)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: platform === 'facebook' ? 'Likes' : 'Following',
                            data: validChartData.map(item => platform === 'facebook' ? item.likes : item.following),
                            backgroundColor: 'rgba(255, 159, 64, 0.6)',
                            borderColor: 'rgba(255, 159, 64, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        title: {
                            display: true,
                            text: `${this.getPlatformDisplayName(platform)} Community`
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `${this.getPlatformDisplayName(platform)} Community`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error(`Error generating ${platform} community chart:`, error);
            return null;
        }
    }

    private async generateFollowersChartForMonth(
        customerId: string,
        month: number,
        year: number,
        platform: string
    ): Promise<ChartData> {
        try {
            let report;
            if (platform === 'instagram') {
                report = await this.reportService.getInstagramCommunityReport(customerId, month, year);
            } else if (platform === 'facebook') {
                report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
            } else if (platform === 'x') {
                report = await this.reportService.getXCommunityReport(customerId, month, year);
            } else if (platform === 'linkedin') {
                report = await this.reportService.getLinkedInCommunityReport(customerId, month, year);
            }

            if (!report?.chart?.length) return { title: `${platform} Followers`, image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: platform === 'facebook' ? 'Likes' : 'Followers',
                        data: report.chart.map(item => platform === 'facebook' ? item.likes : item.followers),
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Followers`
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Followers`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error(`Error generating ${platform} followers chart:`, error);
            return { title: `${platform} Followers`, image: null };
        }
    }

    private async generateImpressionsChartForMonth(
        customerId: string,
        month: number,
        year: number,
        platform: string
    ): Promise<ChartData> {
        try {
            let report;
            if (platform === 'instagram') {
                report = await this.reportService.getInstagramOverviewReport(customerId, month, year);
            } else if (platform === 'facebook') {
                report = await this.reportService.getFacebookOverviewReport(customerId, month, year);
            } else if (platform === 'x') {
                report = await this.reportService.getXOverviewReport(customerId, month, year);
            } else if (platform === 'linkedin') {
                report = await this.reportService.getLinkedInOverviewReport(customerId, month, year);
            }

            if (!report?.chart?.length) return { title: `${platform} Impressions`, image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Impressions',
                        data: report.chart.map(item => item.impressions),
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Impressions`
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Impressions`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error(`Error generating ${platform} impressions chart:`, error);
            return { title: `${platform} Impressions`, image: null };
        }
    }

    private async generateSubscribersChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getYoutubeOverviewReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'YouTube Subscribers', image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Subscribers',
                        data: report.chart.map(item => item.subscribers),
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'YouTube Subscribers'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'YouTube Subscribers',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating YouTube subscribers chart:', error);
            return { title: 'YouTube Subscribers', image: null };
        }
    }

    private async generateViewsChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getYoutubeOverviewReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'YouTube Views', image: null };

            const configuration: ChartConfiguration<'bar'> = {
                type: 'bar',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Views',
                        data: report.chart.map(item => item.totalViews),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'YouTube Views'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'YouTube Views',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating YouTube views chart:', error);
            return { title: 'YouTube Views', image: null };
        }
    }

    private async generateFacebookLikesChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'Facebook Likes', image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Likes',
                        data: report.chart.map(item => item.likes),
                        backgroundColor: 'rgba(59, 89, 152, 0.2)',
                        borderColor: 'rgba(59, 89, 152, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Facebook Likes'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'Facebook Likes',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating Facebook likes chart:', error);
            return { title: 'Facebook Likes', image: null };
        }
    }

    private async generateFacebookImpressionsChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getFacebookOverviewReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'Facebook Impressions', image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Impressions',
                        data: report.chart.map(item => item.impressions),
                        backgroundColor: 'rgba(59, 89, 152, 0.2)',
                        borderColor: 'rgba(59, 89, 152, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Facebook Impressions'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'Facebook Impressions',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating Facebook impressions chart:', error);
            return { title: 'Facebook Impressions', image: null };
        }
    }

    private async generateLinkedInFollowersChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getLinkedInCommunityReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'LinkedIn Followers', image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Followers',
                        data: report.chart.map(item => item.followers),
                        backgroundColor: 'rgba(0, 119, 181, 0.2)',
                        borderColor: 'rgba(0, 119, 181, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'LinkedIn Followers'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'LinkedIn Followers',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating LinkedIn followers chart:', error);
            return { title: 'LinkedIn Followers', image: null };
        }
    }

    private async generateLinkedInImpressionsChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getLinkedInOverviewReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'LinkedIn Impressions', image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Impressions',
                        data: report.chart.map(item => item.impressions),
                        backgroundColor: 'rgba(0, 119, 181, 0.2)',
                        borderColor: 'rgba(0, 119, 181, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'LinkedIn Impressions'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'LinkedIn Impressions',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating LinkedIn impressions chart:', error);
            return { title: 'LinkedIn Impressions', image: null };
        }
    }

    private async generateXFollowersChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getXCommunityReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'X Followers', image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Followers',
                        data: report.chart.map(item => item.followers),
                        backgroundColor: 'rgba(29, 161, 242, 0.2)',
                        borderColor: 'rgba(29, 161, 242, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'X Followers'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'X Followers',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating X followers chart:', error);
            return { title: 'X Followers', image: null };
        }
    }

    private async generateXImpressionsChartForMonth(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getXOverviewReport(customerId, month, year);
            if (!report?.chart?.length) return { title: 'X Impressions', image: null };

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: report.chart.map(item => format(new Date(item.date), 'MMM d')),
                    datasets: [{
                        label: 'Impressions',
                        data: report.chart.map(item => item.impressions),
                        backgroundColor: 'rgba(29, 161, 242, 0.2)',
                        borderColor: 'rgba(29, 161, 242, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'X Impressions'
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: 'X Impressions',
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating X impressions chart:', error);
            return { title: 'X Impressions', image: null };
        }
    }

    private generateCombinedReportHtml(options: {
        platformReports: PlatformReport[];
        logoDataUri: string;
        month: string;
    }): string {
        const currentDate = format(new Date(), 'MMM d, yyyy');

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            margin: 0;
        }
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: #333;
        }
        .logo-container {
            margin: 0;
            padding: 0;
        }
        .logo {
            width: 100px;
            height: auto;
            display: block;
            margin-top: 0;
            margin-bottom: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 24px;
            margin: 0;
        }
        .header p {
            margin: 5px 0 0;
            color: #666;
        }
        .platform-section {
            margin-bottom: 40px;
            page-break-after: always;
        }
        .platform-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 5px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #34495e;
        }
        .chart-container {
            margin: 30px 0;
            height: 300px;
            page-break-inside: avoid;
        }
        .chart-title {
            text-align: center;
            font-size: 16px;
            margin-bottom: 10px;
            color: #34495e;
        }
        .chart-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            font-weight: bold;
            background-color: #f8f9fa;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .growth-text {
            font-style: italic;
            color: #7f8c8d;
            margin-top: -15px;
            margin-bottom: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #95a5a6;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="logo-container">
        <img src="${options.logoDataUri}" class="logo" alt="Company Logo" />
    </div>

    <div class="header">
        <h1>Social Media Analytics Report</h1>
        <p>For ${options.month} | Generated on ${currentDate}</p>
    </div>

    ${options.platformReports.map(platform => `
        <div class="platform-section">
            <div class="platform-title">${platform.name}</div>
            
            ${platform.tables.map(table => `
                <div class="section">
                    <div class="section-title">${table.title}</div>
                    <table>
                        <thead>
                            <tr>
                                ${table.headers.map(header => `<th>${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${table.rows.map(row => `
                                <tr>
                                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${table.growthText ? `<div class="growth-text">${table.growthText}</div>` : ''}
                </div>
            `).join('')}

            ${platform.charts.filter(chart => chart.image).map(chart => `
                <div class="chart-container">
                    <div class="chart-title">${chart.title}</div>
                    <img src="${chart.image}" class="chart-img" />
                </div>
            `).join('')}
        </div>
    `).join('')}

    <div class="footer">
        <p>© ${new Date().getFullYear()} Upstrapp. All rights reserved.</p>
    </div>
</body>
</html>`;
    }

    private generateNoDataHtml(logoDataUri: string, month: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            margin: 0;
        }
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: #333;
        }
        .logo-container {
            margin: 0;
            padding: 0;
        }
        .logo {
            width: 100px;
            height: auto;
            display: block;
            margin-top: 0;
            margin-bottom: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 24px;
            margin: 0;
        }
        .header p {
            margin: 5px 0 0;
            color: #666;
        }
        .no-data-message {
            text-align: center;
            margin: 50px 0;
            color: #7f8c8d;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #95a5a6;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="logo-container">
        <img src="${logoDataUri}" class="logo" alt="Company Logo" />
    </div>

    <div class="header">
        <h1>Social Media Analytics Report</h1>
        <p>For ${month} | Generated on ${format(new Date(), 'MMM d, yyyy')}</p>
    </div>

    <div class="no-data-message">
        <h2>No Data Available</h2>
        <p>No social media data was found for the selected period.</p>
    </div>

    <div class="footer">
        <p>© ${new Date().getFullYear()} Upstrapp. All rights reserved.</p>
    </div>
</body>
</html>`;
    }

    private generateAndSendPdf(
        res: Response,
        html: string,
        platform: string,
        customerId: string,
        period: string
    ) {
        const options: pdf.CreateOptions = {
            format: 'A4',
            border: {
                top: '0.5in',
                right: '0.3in',
                bottom: '0.5in',
                left: '0.3in'
            }
        };

        pdf.create(html, options).toStream((err, stream) => {
            if (err) {
                console.error('PDF generation error:', err);
                return res.status(500).send('Error generating PDF');
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=${platform}-${customerId}-${period}.pdf`
            );
            stream.pipe(res);
        });
    }

    private handleErrorResponse(error: any, res: Response) {
        if (error instanceof BadRequestException) {
            res.status(400).send(error.message);
        } else {
            console.error('PDF Generation Error:', error);
            res.status(500).send('Error generating report');
        }
    }

    @Get('debug-instagram')
    async debugInstagram(
        @Query('customerId') customerId: string,
        @Query('month') month: string,
        @Query('year') year: string,
        @Res() res: Response
    ) {
        try {
            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);

            console.log(`Debugging Instagram for ${customerId}, ${monthNum}/${yearNum}`);

            const data = await this.reportService.getInstagramCommunityReport(customerId, monthNum, yearNum);

            res.json({
                success: !!data,
                data,
                query: {
                    customerId,
                    month: monthNum,
                    year: yearNum,
                    monthString: `${yearNum}-${monthNum.toString().padStart(2, '0')}`
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}


