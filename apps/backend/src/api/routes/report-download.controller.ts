
import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MonthlyReportService } from '../../services/report/monthly-report.service';
import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import * as playwright from 'playwright';

interface ChartData {
    title: string;
    image: string | null;
}

interface TableData {
    title: string;
    headers: string[];
    rows: string[][];
    growthText?: string;
    style?: 'simple' | 'detailed';
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
        @Query('gbp') gbp: string,
        @Query('website') website: string,
        @Res() res: Response
    ) {
        try {
            if (!customerId) throw new BadRequestException('customerId is required');
            if (!month || !year) throw new BadRequestException('Month and year are required');
            const customerName = await this.reportService.getCustomerName(customerId);


            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);

            const reportDate = new Date(yearNum, monthNum - 1, 1);
            if (!isValid(reportDate)) {
                throw new BadRequestException('Invalid month/year combination');
            }

            const currentMonthStart = startOfMonth(reportDate);
            const platforms = {
                instagram: instagram === 'true',
                youtube: youtube === 'true',
                facebook: facebook === 'true',
                linkedin: linkedin === 'true',
                x: x === 'true',
                gbp: gbp === 'true',
                website: website === 'true'
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
                        { type: 'community', generator: this.generateCommunityChart.bind(this) },
                        //  { type: 'followers', generator: this.generateFollowersChart.bind(this) },
                        { type: 'impressions', generator: this.generateInstagramImpressionsChart.bind(this) }
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
                        { type: 'community', serviceMethod: 'getYoutubeCommunityReport' },
                        { type: 'overview', serviceMethod: 'getYoutubeOverviewReport' }
                    ],
                    [
                        { type: 'subscribers', generator: this.generateSubscribersChart.bind(this) },
                        { type: 'views', generator: this.generateViewsChart.bind(this) }
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
                        { type: 'likes', generator: this.generateLikesChart.bind(this) },
                        { type: 'impressions', generator: this.generateFacebookImpressionsChart.bind(this) }
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
                        // { type: 'followers', generator: this.generateFollowersChart.bind(this) },
                        { type: 'impressions', generator: this.generateLinkedInImpressionsChart.bind(this) }
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
                        //  { type: 'followers', generator: this.generateFollowersChart.bind(this) },
                        { type: 'impressions', generator: this.generateXImpressionsChart.bind(this) }
                    ]
                );
                if (xReport) platformReports.push(xReport);
            }

            if (platforms.gbp) {
                const gbpPerformance = await this.processPlatform(
                    'gbp',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'performance', serviceMethod: 'getGBPPerformanceReport' },
                        { type: 'engagement', serviceMethod: 'getGBPEngagementReport' },
                        { type: 'reviews', serviceMethod: 'getGBPReviewsReport' }
                    ],
                    [
                        { type: 'impressions', generator: this.generateGBPImpressionsChart.bind(this) },
                        { type: 'engagement', generator: this.generateGBPEngagementChart.bind(this) }
                    ]
                );
                if (gbpPerformance) platformReports.push(gbpPerformance);
            }

            if (platforms.website) {
                const websiteReport = await this.processPlatform(
                    'website',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'performance', serviceMethod: 'getWebsitePerformanceReport' },
                        { type: 'locations', serviceMethod: 'getWebsiteLocationsReport' }
                    ],
                    [
                        { type: 'traffic', generator: this.generateWebsiteTrafficChart.bind(this) },
                        { type: 'locations', generator: this.generateWebsiteLocationsChart.bind(this) }
                    ]
                );
                if (websiteReport) platformReports.push(websiteReport);
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
            if (!fs.existsSync(logoPath)) {
                throw new Error('Logo file not found');
            }
            const logoBase64 = fs.readFileSync(logoPath, 'base64');
            const logoDataUri = `data:image/png;base64,${logoBase64}`;

            const monthDisplay = format(currentMonthStart, 'MMMM yyyy');

            const html = platformReports.length > 0
                ? this.generateCombinedReportHtml({
                    platformReports,
                    logoDataUri,
                    month: monthDisplay,
                    customerName
                })
                : this.generateNoDataHtml(logoDataUri, monthDisplay, customerName);

            this.generateAndSendPdf(res, html, 'monthly-report', customerId, `${month}-${year}`);

        } catch (error) {
            console.error('Error in downloadCombinedReport:', error);
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
            const rawData: Record<string, any> = {}; // Initialize as empty object

            for (const report of reports) {
                try {
                    console.log(`Calling ${report.serviceMethod} for ${platform}`);

                    // Add check if method exists
                    if (!this.reportService[report.serviceMethod]) {
                        console.error(`Method ${report.serviceMethod} not found in reportService`);
                        continue;
                    }
                    const data = await this.reportService[report.serviceMethod](customerId, month, year);
                    console.log(`${report.serviceMethod} response:`, data);

                    if (data) {
                        rawData[report.type] = data;
                        const table = this.createDetailedTable(
                            `${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report`,
                            data.table,
                            platform,
                            month,
                            year
                        );
                        if (table) {
                            console.log(`Created table for ${platform} ${report.type}`);
                            tables.push(table);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing ${platform} ${report.type} report:`, error);
                }
            }


            let validCharts: ChartData[] = [];
            try {
                const chartResults = await Promise.all(
                    charts.map(chart => chart.generator(customerId, month, year, platform, rawData))
                );
                validCharts = chartResults.filter(chart => chart?.image) as ChartData[];
            } catch (error) {
                console.error(`Error generating charts for ${platform}:`, error);
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

    private createDetailedTable(title: string, tableData: any, platform: string, reportMonth: number, reportYear: number): TableData | null {
        if (!tableData || !tableData.Data || !tableData.Rows || tableData.Rows.length === 0) {
            console.log(`No valid table data for ${platform} ${title}`, tableData);
            return null;
        }

        // Get the 3 months data (previous 2 months + current report month)
        const months = [];
        for (let i = 2; i >= 0; i--) {
            const date = new Date(reportYear, reportMonth - 1 - i, 1);
            months.push(format(date, 'MMM').toUpperCase());
        }

        // The headers should be: ['Data', ...months, 'Change %']
        const headers = tableData.Data;
        // Process rows directly from the service response
        const rows = tableData.Rows.map(row => {
            // Ensure we have the correct number of columns
            if (row.length !== headers.length) {
                // If we're missing the change %, calculate it
                if (row.length === headers.length - 1) {
                    const values = row.slice(1).map(v => this.parseNumber(v));
                    const change = ((values[values.length - 1] - values[0]) / values[0]) * 100;
                    return [...row, `${change.toFixed(2)}%`];
                }
                return row;
            }
            return row;
        });

        // Helper to calculate percentage change between first and last value
        const calculateChange = (values: string[]) => {
            if (values.length < 2) return 'N/A';

            const first = this.parseNumber(values[0]);
            const last = this.parseNumber(values[values.length - 1]);

            if (first === 0) return last === 0 ? '0%' : 'N/A';

            const change = ((last - first) / first) * 100;
            return `${change.toFixed(2)}%`;
        };

        // Platform-specific metric configurations
        const platformMetrics: Record<string, any[]> = {
            instagram: [
                { key: 'Followers', label: 'Followers' },
                { key: 'Following', label: 'Following' },
                { key: 'TotalContent', label: 'Total Content', bold: true }
            ],
            youtube: [
                { key: 'Subscribers', label: 'Subscribers' },
                { key: 'TotalViews', label: 'Total Views' },
                { key: 'TotalVideos', label: 'Total Videos', bold: true }
            ],
            facebook: [
                { key: 'Likes', label: 'Likes' },
                { key: 'Followers', label: 'Followers' },
                { key: 'TotalContent', label: 'Total Content', bold: true }
            ],
            linkedin: [
                { key: 'Followers', label: 'Followers' },
                { key: 'Paid Followers', label: 'Paid Followers' },
                { key: 'Posts', label: 'Posts', bold: true }
            ],
            x: [
                { key: 'Followers', label: 'Followers' },
                { key: 'Following', label: 'Following' },
                { key: 'TotalContent', label: 'Total Content', bold: true }
            ]
        };

        const metrics = platformMetrics[platform] || [
            { key: 'Followers', label: 'Followers' },
            { key: 'Following', label: 'Following' },
            { key: 'TotalContent', label: 'Total Content', bold: true }
        ];

        metrics.forEach(metric => {
            if (tableData[metric.key] && tableData[metric.key].length > 0) {
                // Get the values for the metric
                let values = tableData[metric.key];

                // If we have less than 3 values, pad with zeros at the beginning
                while (values.length < 3) {
                    values = ['0', ...values];
                }

                // Take the last 3 values
                values = values.slice(-3);

                const change = calculateChange(values);

                rows.push([
                    metric.bold ? `**${metric.label}**` : metric.label,
                    ...values,
                    change
                ]);
            }
        });

        if (rows.length === 0) {
            return null;
        }
        // Filter out Total Content for specific platforms
        let filteredRows = [...tableData.Rows];

        if (['youtube', 'linkedin', 'x'].includes(platform.toLowerCase())) {
            filteredRows = filteredRows.filter(row =>
                !row[0].toLowerCase().includes('total content'));
        }
        else if (['instagram', 'facebook'].includes(platform.toLowerCase())) {
            // Move Total Content to last row
            const totalContentIndex = filteredRows.findIndex(row =>
                row[0].toLowerCase().includes('total content'));
            if (totalContentIndex > -1) {
                const [totalContentRow] = filteredRows.splice(totalContentIndex, 1);
                filteredRows.push(totalContentRow);
            }
        }

        if (filteredRows.length === 0) {
            return null;
        }

        return {
            title,
            headers: tableData.Data,
            rows: filteredRows,
            growthText: tableData.Growth || '',
            style: 'detailed',
        };
    }

    private parseNumber(value: string): number {
        if (!value) return 0;
        if (value === 'N/A') return 0;

        // Handle k-formatted numbers (e.g., 1.2k)
        if (value.toLowerCase().includes('k')) {
            return parseFloat(value) * 1000;
        }

        return parseFloat(value.replace(/[^0-9.]/g, ''));
    }

    private kFormatter(num: number | string): string {
        if (typeof num === 'string') {
            num = this.parseNumber(num);
        }
        return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
    }

    private sampleData(data: any[], maxPoints = 10) {
        if (data.length <= maxPoints) return data;

        const step = Math.ceil(data.length / maxPoints);
        const sampledData = [];

        for (let i = 0; i < data.length; i += step) {
            sampledData.push(data[i]);
        }

        // Always include the last data point
        if (!sampledData.includes(data[data.length - 1])) {
            sampledData.push(data[data.length - 1]);
        }

        return sampledData;
    }

    private getDataWithDayGap(data: any[], dayGap: number, month: number, year: number): any[] {
        if (data.length === 0) return [];

        // For monthly data (3 points or less), return all points with proper dates
        if (data.length <= 3) {
            return data.map(item => ({
                ...item,
                date: new Date(item.date || item.createdAt)
            }));
        }

        // For daily data, ensure we get at least 10 points spread evenly
        const sortedData = [...data]
            .map(item => ({
                ...item,
                date: new Date(item.date || item.createdAt)
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        const firstDay = sortedData[0].date.getDate();
        const lastDay = sortedData[sortedData.length - 1].date.getDate();
        const totalDays = lastDay - firstDay + 1;

        // Calculate optimal day gap to get ~10 points
        const optimalGap = Math.max(1, Math.floor(totalDays / 10));

        const result = [];
        for (let day = firstDay; day <= lastDay; day += optimalGap) {
            // Find data point closest to this day
            const targetDate = new Date(year, month - 1, day);
            let closest = null;
            let minDiff = Infinity;

            for (const item of sortedData) {
                const diff = Math.abs(item.date.getDate() - day);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = item;
                }
            }

            if (closest) {
                result.push(closest);
            }
        }

        // Always include the first and last data points
        if (!result.some(item => item.date.getDate() === firstDay)) {
            result.unshift(sortedData[0]);
        }
        if (!result.some(item => item.date.getDate() === lastDay)) {
            result.push(sortedData[sortedData.length - 1]);
        }

        return result.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    private formatChartData(data: any[], month: number, year: number) {
        return data
            .map(item => ({
                ...item,
                date: new Date(item.date || item.createdAt)
            }))
            .filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() + 1 === month &&
                    itemDate.getFullYear() === year;
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    private async generateCommunityChart(
        customerId: string,
        month: number,
        year: number,
        platform: string,
        preloadedData?: any
    ): Promise<ChartData | null> {
        try {
            let report = preloadedData?.community;

            if (!report) {
                if (platform === 'instagram') {
                    report = await this.reportService.getInstagramCommunityReport(customerId, month, year);
                } else if (platform === 'facebook') {
                    report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
                } else if (platform === 'x') {
                    report = await this.reportService.getXCommunityReport(customerId, month, year);
                } else if (platform === 'linkedin') {
                    report = await this.reportService.getLinkedInCommunityReport(customerId, month, year);
                }

                if (!report?.chart?.length) {
                    console.log(`No chart data for ${platform} community report`);
                    return null;
                }
            }

            const monthData = report.chart.filter(item => {
                const date = new Date(item.date);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });

            monthData.sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            const sampledData = [];
            const daysInMonth = new Date(year, month, 0).getDate();
            const dayInterval = 4; // Fixed 4-day gap

            for (let day = 1; day <= daysInMonth; day += dayInterval) {
                let closest = null;
                let minDiff = Infinity;

                for (const item of monthData) {
                    const itemDate = new Date(item.date);
                    const diff = Math.abs(itemDate.getDate() - day);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = item;
                    }
                }

                if (closest) sampledData.push(closest);
            }

            const lastDayData = monthData.find(item => {
                const itemDate = new Date(item.date);
                return itemDate.getDate() === daysInMonth;
            });

            if (lastDayData && !sampledData.some(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            })) {
                sampledData.push(lastDayData);
            }

            const labels = sampledData.map(item => {
                const date = new Date(item.date || item.createdAt);
                return format(date, 'MMM d');
            });

            const configuration: ChartConfiguration<'bar'> = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: platform === 'facebook' ? 'Likes' : 'Followers',
                            data: sampledData.map(item => platform === 'facebook' ? item.likes : item.followers),
                            backgroundColor: 'rgba(193, 53, 132, 0.5)',
                            borderColor: 'rgba(193, 53, 132, 1)',
                            borderWidth: 1
                        },
                        ...(platform !== 'facebook' ? [{
                            label: 'Following',
                            data: sampledData.map(item => item.following),
                            backgroundColor: 'rgba(255, 159, 64, 0.5)',
                            borderColor: 'rgba(255, 159, 64, 1)',
                            borderWidth: 1
                        }] : [])
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    const date = new Date(sampledData[tooltipItems[0].dataIndex].date || sampledData[tooltipItems[0].dataIndex].createdAt);
                                    return format(date, 'MMMM d, yyyy');
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Day of Month',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                autoSkip: false
                            },
                            stacked: false
                        },
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: (value) => {
                                    return Number(value) >= 1000 ? `${Number(value) / 1000}k` : value;
                                }
                            },
                            stacked: false
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `${this.getPlatformDisplayName(platform)} Daily Community Growth (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error(`Error generating ${platform} community chart:`, error);
            return null;
        }
    }

    async generateInstagramImpressionsChart(customerId: string, month: number, year: number, preloadedData?: any): Promise<ChartData> {
        const report = preloadedData?.overview || await this.reportService.getInstagramOverviewReport(customerId, month, year);
        if (!report?.chart?.length) return { title: 'Instagram Impressions & Reach', image: null };

        const rawChartData = report.chart.map(item => ({
            date: new Date(item.date || item.createdAt),
            impressions: item.impressions || 0,
            avgReachPerDay: item.avgReachPerDay || 0
        }));

        const daysInMonth = new Date(year, month, 0).getDate();
        const completeData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const found = rawChartData.find(d => d.date.getDate() === day && d.date.getMonth() + 1 === month && d.date.getFullYear() === year);
            return found
                ? { ...found, day, isActualData: true }
                : { date: new Date(year, month - 1, day), impressions: 0, avgReachPerDay: 0, day, isActualData: false };
        });

        const sampledData = [];
        for (let i = 0; i < daysInMonth; i += 4) sampledData.push(completeData[i]);
        if (!sampledData.some(d => d.day === daysInMonth)) sampledData.push(completeData[daysInMonth - 1]);

        const labels = sampledData.map(d => format(d.date, 'MMM d'));
        const impressionsData = sampledData.map(d => d.impressions);
        const reachData = sampledData.map(d => d.avgReachPerDay);

        const configuration: ChartConfiguration<'bar' | 'line'> = {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Impressions',
                        data: impressionsData,
                        backgroundColor: '#E1306C80',
                        borderColor: '#E1306C',
                        borderWidth: 2,
                        type: 'bar',
                        yAxisID: 'y',
                        order: 2 // 👈 put bars behind
                    },
                    {
                        label: 'Avg Reach/Day',
                        data: reachData,
                        backgroundColor: '#36b9cc20',
                        borderColor: '#36b9cc',
                        borderWidth: 2,
                        tension: 0.3,
                        type: 'line',
                        yAxisID: 'y1',
                        pointBackgroundColor: '#36b9cc',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        order: 1 // 👈 line in front
                    }
                ]

            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: items => format(sampledData[items[0].dataIndex].date, 'MMMM d, yyyy'),
                            label: ctx => {
                                const dp = sampledData[ctx.dataIndex];
                                const val = ctx.parsed.y.toLocaleString();
                                const label = `${ctx.dataset.label}: ${val}`;
                                return dp.isActualData ? label : `${label} (estimated)`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Day of Month', font: { weight: 'bold' } } },
                    y: {
                        title: { display: true, text: 'Impressions', font: { weight: 'bold' } },
                        ticks: { callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v }
                    },
                    y1: {
                        title: { display: true, text: 'Avg Reach/Day', font: { weight: 'bold' } },
                        grid: { drawOnChartArea: false },
                        ticks: { callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        return {
            title: `Instagram Profile Overview (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
            image: `data:image/png;base64,${imageBuffer.toString('base64')}`
        };
    }

    async generateFacebookImpressionsChart(customerId: string, month: number, year: number, preloadedData?: any): Promise<ChartData> {
        const report = preloadedData?.overview || await this.reportService.getFacebookOverviewReport(customerId, month, year);
        if (!report?.chart?.length) return { title: 'Facebook Impressions & Reach', image: null };

        const rawChartData = report.chart.map(item => ({
            date: new Date(item.date || item.createdAt),
            impressions: item.impressions || 0,
            avgReachPerDay: item.avgReachPerDay || 0
        }));

        const daysInMonth = new Date(year, month, 0).getDate();
        const completeData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const found = rawChartData.find(d => d.date.getDate() === day && d.date.getMonth() + 1 === month && d.date.getFullYear() === year);
            return found
                ? { ...found, day, isActualData: true }
                : { date: new Date(year, month - 1, day), impressions: 0, avgReachPerDay: 0, day, isActualData: false };
        });

        const sampledData = [];
        for (let i = 0; i < daysInMonth; i += 4) sampledData.push(completeData[i]);
        if (!sampledData.some(d => d.day === daysInMonth)) sampledData.push(completeData[daysInMonth - 1]);

        const labels = sampledData.map(d => format(d.date, 'MMM d'));
        const impressionsData = sampledData.map(d => d.impressions);
        const reachData = sampledData.map(d => d.avgReachPerDay);
        console.log("reachData: - ", reachData)
        const configuration: ChartConfiguration<'bar' | 'line'> = {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Impressions',
                        data: impressionsData,
                        backgroundColor: '#1877F280',
                        borderColor: '#1877F2',
                        borderWidth: 2,
                        type: 'bar',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Avg Reach/Day',
                        data: reachData,
                        backgroundColor: '#36b9cc20',
                        borderColor: '#36b9cc',
                        borderWidth: 2,
                        tension: 0.3,
                        type: 'line',
                        yAxisID: 'y1',
                        pointBackgroundColor: '#36b9cc',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: items => format(sampledData[items[0].dataIndex].date, 'MMMM d, yyyy'),
                            label: ctx => {
                                const dp = sampledData[ctx.dataIndex];
                                const val = ctx.parsed.y.toLocaleString();
                                const label = `${ctx.dataset.label}: ${val}`;
                                return dp.isActualData ? label : `${label} (estimated)`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Day of Month', font: { weight: 'bold' } } },
                    y: {
                        title: { display: true, text: 'Impressions', font: { weight: 'bold' } },
                        ticks: { callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v }
                    },
                    y1: {
                        title: { display: true, text: 'Avg Reach/Day', font: { weight: 'bold' } },
                        grid: { drawOnChartArea: false },
                        ticks: { callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        return {
            title: `Facebook Daily Impressions & Reach (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
            image: `data:image/png;base64,${imageBuffer.toString('base64')}`
        };
    }

    async generateXImpressionsChart(customerId: string, month: number, year: number, preloadedData?: any): Promise<ChartData> {
        const report = preloadedData?.overview || await this.reportService.getXOverviewReport(customerId, month, year);
        if (!report?.chart?.length) return { title: 'X Performance', image: null };

        const rawChartData = report.chart.map(item => ({
            date: new Date(item.date || item.createdAt),
            impressions: item.impressions || 0,
            engagement: item.engagement || 0,
            interactions: item.interactions || 0
        }));

        const daysInMonth = new Date(year, month, 0).getDate();
        const completeData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const found = rawChartData.find(d => d.date.getDate() === day && d.date.getMonth() + 1 === month && d.date.getFullYear() === year);
            return found
                ? { ...found, day, isActualData: true }
                : { date: new Date(year, month - 1, day), impressions: 0, engagement: 0, interactions: 0, day, isActualData: false };
        });

        const sampledData = [];
        for (let i = 0; i < daysInMonth; i += 4) sampledData.push(completeData[i]);
        if (!sampledData.some(d => d.day === daysInMonth)) sampledData.push(completeData[daysInMonth - 1]);

        const labels = sampledData.map(d => format(d.date, 'MMM d'));
        const impressionsData = sampledData.map(d => d.impressions);
        const reachData = sampledData.map(d => d.engagement);
        const interactionsData = sampledData.map(d => d.interactions);

        const configuration: ChartConfiguration<'bar' | 'line'> = {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Impressions',
                        data: impressionsData,
                        backgroundColor: '#1DA1F2B3', // Twitter blue with opacity
                        borderColor: '#1DA1F2',
                        borderWidth: 2,
                        type: 'bar',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Engagement',
                        data: reachData,
                        borderColor: '#28C76F', // green
                        backgroundColor: '#28C76F33',
                        borderWidth: 2,
                        tension: 0.4,
                        type: 'line',
                        yAxisID: 'y1',
                        pointBackgroundColor: '#28C76F',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    //   {
                    // label: 'Interactions',
                    // data: interactionsData,
                    // borderColor: '#FF9F43', // orange
                    // backgroundColor: '#FF9F4333',
                    // borderWidth: 2,
                    // tension: 0.4,
                    // type: 'line',
                    // yAxisID: 'y2',
                    // pointBackgroundColor: '#FF9F43',
                    // pointRadius: 4,
                    // pointHoverRadius: 6
                    //   }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `X Daily Performance (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            title: items => format(sampledData[items[0].dataIndex].date, 'MMMM d, yyyy'),
                            label: ctx => {
                                const dp = sampledData[ctx.dataIndex];
                                const val = ctx.parsed.y.toLocaleString();
                                const label = `${ctx.dataset.label}: ${val}`;
                                return dp.isActualData ? label : `${label} (estimated)`;
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 20 }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Day of Month',
                            font: { weight: 'bold' }
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true
                        }
                    },
                    y: {
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Impressions',
                            font: { weight: 'bold' }
                        },
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                        }
                    },
                    y1: {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Avg Reach/Day',
                            font: { weight: 'bold' }
                        },
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                        }
                    },
                    y2: {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Interactions',
                            font: { weight: 'bold' }
                        },
                        grid: { drawOnChartArea: false },
                        offset: true,
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        return {
            title: `X Daily Performance (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
            image: `data:image/png;base64,${imageBuffer.toString('base64')}`
        };
    }

    async generateLinkedInImpressionsChart(customerId: string, month: number, year: number, preloadedData?: any): Promise<ChartData> {
        const report = preloadedData?.overview || await this.reportService.getLinkedInOverviewReport(customerId, month, year);
        if (!report?.chart?.length) return { title: 'LinkedIn Impressions & Reach', image: null };

        const rawChartData = report.chart.map(item => ({
            date: new Date(item.date || item.createdAt),
            impressions: item.impressions || 0,
            // avgReachPerDay: item.avgReachPerDay || 0,
            posts: item.posts || 0,           // ✅ Add this
            followers: item.followers || 0    // ✅ Add this

        }));

        const daysInMonth = new Date(year, month, 0).getDate();
        const completeData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const found = rawChartData.find(d => d.date.getDate() === day && d.date.getMonth() + 1 === month && d.date.getFullYear() === year);
            return found
                ? { ...found, day, isActualData: true }
                : {
                    date: new Date(year, month - 1, day), impressions: 0, posts: 0,
                    followers: 0, day, isActualData: false
                };
        });

        const sampledData = [];
        for (let i = 0; i < daysInMonth; i += 4) sampledData.push(completeData[i]);
        if (!sampledData.some(d => d.day === daysInMonth)) sampledData.push(completeData[daysInMonth - 1]);

        const labels = sampledData.map(d => format(d.date, 'MMM d'));
        const impressionsData = sampledData.map(d => d.impressions);
        //  const reachData = sampledData.map(d => d.avgReachPerDay);
        const postsData = sampledData.map(d => d.posts);
        const followersData = sampledData.map(d => d.followers);


        const configuration: ChartConfiguration<'bar' | 'line'> = {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Impressions',
                        data: impressionsData,
                        backgroundColor: '#0077B580',
                        borderColor: '#0077B5',
                        borderWidth: 2,
                        type: 'bar',
                        yAxisID: 'y'
                    },
                    //  {
                    //     label: 'Avg Reach/Day',
                    //     data: reachData,
                    //     backgroundColor: '#36b9cc20',
                    //     borderColor: '#36b9cc',
                    //     borderWidth: 2,
                    //     tension: 0.3,
                    //     type: 'line',
                    //     yAxisID: 'y1',
                    //     pointBackgroundColor: '#36b9cc',
                    //     pointRadius: 4,
                    //     pointHoverRadius: 6
                    // },
                    {
                        label: 'Posts',
                        data: postsData,
                        backgroundColor: '#f6c23e20',
                        borderColor: '#f6c23e',
                        borderWidth: 2,
                        tension: 0.3,
                        type: 'line',
                        yAxisID: 'y2',
                        pointBackgroundColor: '#f6c23e',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    // {
                    //     label: 'Followers',
                    //     data: followersData,
                    //     backgroundColor: '#e74a3b20',
                    //     borderColor: '#e74a3b',
                    //     borderWidth: 2,
                    //     tension: 0.3,
                    //     type: 'line',
                    //     yAxisID: 'y2',
                    //     pointBackgroundColor: '#e74a3b',
                    //     pointRadius: 4,
                    //     pointHoverRadius: 6
                    // }

                ]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: items => format(sampledData[items[0].dataIndex].date, 'MMMM d, yyyy'),
                            label: ctx => {
                                const dp = sampledData[ctx.dataIndex];
                                const val = ctx.parsed.y.toLocaleString();
                                const label = `${ctx.dataset.label}: ${val}`;
                                return dp.isActualData ? label : `${label} (estimated)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Day of Month',
                            font: { weight: 'bold' }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Impressions',
                            font: { weight: 'bold' }
                        },
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                        }
                    },
                    // y1: {
                    //     title: {
                    //         display: true,
                    //         text: 'Avg Reach/Day',
                    //         font: { weight: 'bold' }
                    //     },
                    //     grid: { drawOnChartArea: false },
                    //     ticks: {
                    //         callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                    //     }
                    // },
                    y2: {
                        title: {
                            display: true,
                            text: 'Posts / Followers',
                            font: { weight: 'bold' }
                        },
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                        }
                    }

                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        return {
            title: `LinkedIn Daily Impressions & Reach (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
            image: `data:image/png;base64,${imageBuffer.toString('base64')}`
        };
    }

    private async generateFollowersChart(
        customerId: string,
        month: number,
        year: number,
        platform: string,
        preloadedData?: any
    ): Promise<ChartData | null> {
        try {
            let report = preloadedData?.community;

            if (!report) {
                if (platform === 'instagram') {
                    report = await this.reportService.getInstagramCommunityReport(customerId, month, year);
                } else if (platform === 'facebook') {
                    report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
                } else if (platform === 'x') {
                    report = await this.reportService.getXCommunityReport(customerId, month, year);
                } else if (platform === 'linkedin') {
                    report = await this.reportService.getLinkedInCommunityReport(customerId, month, year);
                }

                if (!report?.chart?.length) {
                    console.log(`No chart data for ${platform} community report`);
                    return null;
                }
            }

            // 1. Filter data for the selected month only
            const monthData = report.chart.filter(item => {
                const date = new Date(item.date || item.createdAt);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });

            // 2. Sort by date (oldest to newest)
            monthData.sort((a, b) =>
                new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
            );

            // 3. Sample data to show ~10 points for better readability
            const daysInMonth = new Date(year, month, 0).getDate();
            const dayInterval = Math.max(1, Math.floor(daysInMonth / 10)); // Show ~10 points
            const sampledData = [];

            for (let day = 1; day <= daysInMonth; day += dayInterval) {
                // Find the closest data point to this day
                let closest = null;
                let minDiff = Infinity;

                for (const item of monthData) {
                    const itemDate = new Date(item.date);
                    const diff = Math.abs(itemDate.getDate() - day);

                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = item;
                    }
                }

                if (closest) sampledData.push(closest);
            }

            // Always include the last day of month if not already included
            const lastDayData = monthData.find(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            });

            if (lastDayData && !sampledData.some(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            })) {
                sampledData.push(lastDayData);
            }

            // Create labels showing abbreviated month and day (Apr 1, Apr 4, etc.)
            const labels = sampledData.map(item => {
                const date = new Date(item.date || item.createdAt);
                return format(date, 'MMM d'); // "Apr 1" format
            });

            const platformColor = this.getPlatformColor(platform);
            const metricName = platform === 'facebook' ? 'Likes' : 'Followers';

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: metricName,
                        data: sampledData.map(item => platform === 'facebook' ? item.likes : item.followers),
                        backgroundColor: `${platformColor}20`,
                        borderColor: platformColor,
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointBackgroundColor: platformColor,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${this.getPlatformDisplayName(platform)} Daily ${metricName} Growth (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                            font: { size: 16 }
                        },
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    const date = new Date(sampledData[tooltipItems[0].dataIndex].date ||
                                        sampledData[tooltipItems[0].dataIndex].createdAt);
                                    return format(date, 'MMMM d, yyyy'); // Full date in tooltip
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Day of Month',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                autoSkip: false
                            }
                        },
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: (value) => {
                                    return Number(value) >= 1000 ? `${Number(value) / 1000}k` : value;
                                }
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `${this.getPlatformDisplayName(platform)} Daily ${metricName} Growth (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error(`Error generating ${platform} followers chart:`, error);
            return { title: `${this.getPlatformDisplayName(platform)} Followers`, image: null };
        }
    }

    private async generateSubscribersChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'youtube',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.overview;

            if (!report) {
                report = await this.reportService.getYoutubeOverviewReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'YouTube Analytics', image: null };
            }

            const monthData = report.chart.filter(item => {
                const date = new Date(item.date || item.createdAt);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });

            if (!monthData.length) {
                return { title: 'YouTube Analytics', image: null };
            }

            monthData.sort((a, b) =>
                new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
            );

            const daysInMonth = new Date(year, month, 0).getDate();
            const sampledData = [];
            const interval = 4;

            for (let day = 1; day <= daysInMonth; day += interval) {
                let closest = null;
                let minDiff = Infinity;

                for (const item of monthData) {
                    const itemDate = new Date(item.date || item.createdAt);
                    const diff = Math.abs(itemDate.getDate() - day);

                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = item;
                    }
                }

                if (closest) sampledData.push(closest);
            }

            const lastDayData = monthData.find(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            });

            if (lastDayData && !sampledData.some(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            })) {
                sampledData.push(lastDayData);
            }

            const labels = sampledData.map(item => {
                const date = new Date(item.date || item.createdAt);
                return format(date, 'MMM d');
            });

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Subscribers',
                            data: sampledData.map(item => Number(item.subscribers) || 0),
                            backgroundColor: '#8e44ad80',
                            borderColor: '#8e44ad',
                            borderWidth: 2,
                            type: 'bar',
                            borderRadius: 5,
                            order: 2,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Total Views',
                            data: sampledData.map(item => Number(item.totalViews) || 0),
                            backgroundColor: '#2ecc7120',
                            borderColor: '#2ecc71',
                            borderWidth: 3,
                            type: 'line',
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 0,
                            order: 1,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Total Videos',
                            data: sampledData.map(item => Number(item.totalVideos) || 0),
                            backgroundColor: '#f39c1220',
                            borderColor: '#f39c12',
                            borderWidth: 3,
                            type: 'line',
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 0,
                            order: 1,
                            yAxisID: 'y2'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    const date = new Date(sampledData[tooltipItems[0].dataIndex].date || sampledData[tooltipItems[0].dataIndex].createdAt);
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${value.toLocaleString()}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Day of Month',
                                font: { weight: 'bold' }
                            },
                            ticks: { autoSkip: false }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Subscribers',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                callback: value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Total Views',
                                font: { weight: 'bold' }
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                callback: value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value
                            }
                        },
                        y2: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            offset: true,
                            title: {
                                display: true,
                                text: 'Total Videos',
                                font: { weight: 'bold' }
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                callback: value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            return {
                title: `YouTube Analytics (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating YouTube analytics chart:', error);
            return { title: 'YouTube Analytics', image: null };
        }
    }

    private async generateViewsChart(
        customerId: string,
        month: number,
        year: number
    ): Promise<ChartData> {
        try {
            const report = await this.reportService.getYoutubeOverviewReport(customerId, month, year); // Ensure days is string
            if (!report?.chart?.length) return { title: 'YouTube Analytics', image: null };

            const monthData = report.chart
                .filter(item => {
                    const date = new Date(item.date || item.createdAt);
                    return date.getMonth() + 1 === month && date.getFullYear() === year;
                })
                .sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());

            if (!monthData.length) return { title: 'YouTube Analytics', image: null };

            const daysInMonth = new Date(year, month, 0).getDate();
            const sampledData = [];
            const interval = 4;

            for (let day = 1; day <= daysInMonth; day += interval) {
                let closest = null;
                let minDiff = Infinity;

                for (const item of monthData) {
                    const itemDate = new Date(item.date || item.createdAt);
                    const diff = Math.abs(itemDate.getDate() - day);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = item;
                    }
                }

                if (closest) sampledData.push(closest);
            }

            // Ensure last day is included
            const lastDayData = monthData.find(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            });
            if (
                lastDayData &&
                !sampledData.some(item => {
                    const itemDate = new Date(item.date || item.createdAt);
                    return itemDate.getDate() === daysInMonth;
                })
            ) {
                sampledData.push(lastDayData);
            }

            const labels = sampledData.map(item => {
                const date = new Date(item.date || item.createdAt);
                return format(date, 'MMM d');
            });

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        // {
                        //     label: 'Total Views',
                        //     data: sampledData.map(item => item.totalViews || 0),
                        //     backgroundColor: '#FF000080', // YouTube red with opacity
                        //     borderColor: '#FF0000',
                        //     borderWidth: 1,
                        //     borderRadius: 4,
                        //     yAxisID: 'y',
                        //     type: 'bar',z
                        //     order: 3
                        // },
                        {
                            label: 'Total Videos',
                            data: sampledData.map(item => item.totalVideos || 0),
                            backgroundColor: '#28282880', // Dark gray
                            borderColor: '#282828',
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y',
                            type: 'bar',
                            order: 2
                        },
                        {
                            label: 'Likes',
                            data: sampledData.map(item => item.likes || 0),
                            type: 'line',
                            borderColor: '#FF6384', // red-pink
                            backgroundColor: '#FF638420',
                            borderWidth: 3,
                            tension: 0.3,
                            pointBackgroundColor: '#FF6384',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            yAxisID: 'y1',
                            order: 1
                        },
                        {
                            label: 'Comments',
                            data: sampledData.map(item => item.comments || 0),
                            type: 'line',
                            borderColor: '#36A2EB', // Blue
                            backgroundColor: '#36A2EB20',
                            borderWidth: 3,
                            tension: 0.3,
                            pointBackgroundColor: '#36A2EB',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            yAxisID: 'y1',
                            order: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `YouTube Analytics (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                            font: { size: 16 }
                        },
                        tooltip: {
                            callbacks: {
                                title: tooltipItems => {
                                    const item = sampledData[tooltipItems[0].dataIndex];
                                    const date = new Date(item.date || item.createdAt);
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: context => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${value.toLocaleString()}`;
                                }
                            }
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                autoSkip: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Views & Videos',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                callback: value => {
                                    return Number(value) >= 1000
                                        ? `${(Number(value) / 1000).toFixed(0)}k`
                                        : value;
                                }
                            }
                        },
                        y1: {
                            beginAtZero: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            },
                            title: {
                                display: true,
                                text: 'Likes & Comments',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                callback: value => {
                                    return Number(value) >= 1000
                                        ? `${(Number(value) / 1000).toFixed(0)}k`
                                        : value;
                                }
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `YouTube Analytics (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating YouTube analytics chart:', error);
            return { title: 'YouTube Analytics', image: null };
        }
    }

    private async generateLikesChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'facebook',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.community;
            if (!report) {
                report = await this.reportService.getFacebookCommunityReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'Facebook Likes', image: null };
            }

            const monthData = report.chart.filter(item => {
                const date = new Date(item.date || item.createdAt);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });

            if (!monthData.length) {
                return { title: 'Facebook Likes', image: null };
            }

            // Sort by date
            monthData.sort((a, b) =>
                new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
            );

            // 4-day gap sampling
            const daysInMonth = new Date(year, month, 0).getDate();
            const dayInterval = 4;
            const sampledData = [];

            for (let day = 1; day <= daysInMonth; day += dayInterval) {
                let closest = null;
                let minDiff = Infinity;

                for (const item of monthData) {
                    const itemDate = new Date(item.date || item.createdAt);
                    const diff = Math.abs(itemDate.getDate() - day);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = item;
                    }
                }

                if (closest) sampledData.push(closest);
            }

            // Ensure last day is included
            const lastDayData = monthData.find(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            });

            if (lastDayData && !sampledData.some(item => {
                const itemDate = new Date(item.date || item.createdAt);
                return itemDate.getDate() === daysInMonth;
            })) {
                sampledData.push(lastDayData);
            }

            const labels = sampledData.map(item => {
                const date = new Date(item.date || item.createdAt);
                return format(date, 'MMM d');
            });

            const platformColor = this.getPlatformColor('facebook');
            const followersColor = '#1f77b4'; // Line color for followers (blue)

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Likes',
                            data: sampledData.map(item => item.likes || 0),
                            backgroundColor: platformColor,
                            borderColor: platformColor,
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y',
                        },
                        {
                            type: 'line',
                            label: 'Followers',
                            data: sampledData.map(item => item.followers || 0),
                            borderColor: followersColor,
                            backgroundColor: `${followersColor}20`,
                            tension: 0.4,
                            borderWidth: 2,
                            fill: false,
                            pointBackgroundColor: followersColor,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            yAxisID: 'y1',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `Facebook Likes & Followers Growth (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                            font: { size: 16 }
                        },
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    const date = new Date(sampledData[tooltipItems[0].dataIndex].date ||
                                        sampledData[tooltipItems[0].dataIndex].createdAt);
                                    return format(date, 'MMMM d, yyyy');
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                autoSkip: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Likes'
                            },
                            ticks: {
                                callback: (value) => {
                                    return Number(value) >= 1000 ? `${Number(value) / 1000}k` : value;
                                }
                            }
                        },
                        y1: {
                            beginAtZero: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            },
                            title: {
                                display: true,
                                text: 'Followers'
                            },
                            ticks: {
                                callback: (value) => {
                                    return Number(value) >= 1000 ? `${Number(value) / 1000}k` : value;
                                }
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `Facebook Likes & Followers Growth (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating Facebook likes chart:', error);
            return { title: 'Facebook Likes', image: null };
        }
    }
    // Add these new chart generation methods to the controller
    private async generateGBPImpressionsChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'gbp',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.performance;
            if (!report) {
                report = await this.reportService.getGBPPerformanceReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'GBP Impressions', image: null };
            }

            // Process and format chart data
            const monthData = this.formatChartData(report.chart, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const mapsData = sampledData.map(d => d.maps || 0);
            const searchData = sampledData.map(d => d.search || 0);

            const configuration: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Google maps',
                            data: mapsData,
                            borderColor: '#4285F4', // Google blue
                            backgroundColor: '#4285F420',
                            tension: 0.3,
                            borderWidth: 2
                        },
                        {
                            label: 'Google search',
                            data: searchData,
                            borderColor: '#34A853', // Google green
                            backgroundColor: '#34A85320',
                            tension: 0.3,
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            // display: true,
                            // text: `GBP Daily Impressions (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Impressions' }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `GBP Daily Impressions (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating GBP impressions chart:', error);
            return { title: 'GBP Impressions', image: null };
        }
    }

    private async generateGBPEngagementChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'gbp',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.engagement;
            if (!report) {
                report = await this.reportService.getGBPEngagementReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'GBP Engagement', image: null };
            }

            const monthData = this.formatChartData(report.chart, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const websiteData = sampledData.map(d => d.website || 0);
            const phoneData = sampledData.map(d => d.phone || 0);
            const directionsData = sampledData.map(d => d.directions || 0);

            const configuration: ChartConfiguration<'bar'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Website',
                            data: websiteData,
                            backgroundColor: '#4285F4' // Google blue
                        },
                        {
                            label: 'Phone',
                            data: phoneData,
                            backgroundColor: '#EA4335' // Google red
                        },
                        {
                            label: 'Directions',
                            data: directionsData,
                            backgroundColor: '#FBBC05' // Google yellow
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            // display: true,
                            // text: `GBP Daily Engagement (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Engagement' }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `GBP Daily Engagement (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating GBP engagement chart:', error);
            return { title: 'GBP Engagement', image: null };
        }
    }

    private async generateWebsiteTrafficChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'website',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.performance;
            if (!report) {
                report = await this.reportService.getWebsitePerformanceReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'Website Traffic', image: null };
            }

            const monthData = this.formatChartData(report.chart, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const pageViews = sampledData.map(d => d.pageViews || 0);
            const visits = sampledData.map(d => d.visits || 0);
            const visitors = sampledData.map(d => d.visitors || 0);

            const configuration: ChartConfiguration<'line' | 'bar'> = {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Page Views',
                            data: pageViews,
                            type: 'bar',
                            backgroundColor: '#0d6efd80',
                            borderColor: '#0d6efd',
                            borderWidth: 2,
                            order: 1
                        },
                        {
                            label: 'Visits',
                            data: visits,
                            type: 'line',
                            borderColor: '#fd7e14',
                            backgroundColor: '#fd7e1420',
                            tension: 0.3,
                            borderWidth: 2,
                            fill: false,
                            pointBackgroundColor: '#fd7e14',
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            order: 0
                        },
                        {
                            label: 'Visitors',
                            data: visitors,
                            type: 'line',
                            borderColor: '#20c997',
                            backgroundColor: '#20c99720',
                            tension: 0.3,
                            borderWidth: 2,
                            fill: false,
                            pointBackgroundColor: '#20c997',
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            order: 0
                        }
                    ]


                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            // display: true,
                            // text: `Website Daily Traffic (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Count' }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `Website Daily Traffic (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating website traffic chart:', error);
            return { title: 'Website Traffic', image: null };
        }
    }

    private async generateWebsiteLocationsChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'website',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.locations;
            if (!report) {
                report = await this.reportService.getWebsiteLocationsReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'Website Visitor Locations', image: null };
            }

            const chartData = report.chart.slice(0, 10); // Top 10 countries

            const totalVisitors = chartData.reduce((sum, item) => sum + item.visitors, 0);

            const labels = chartData.map(d => d.country);
            const data = chartData.map(d => d.visitors);
            const backgroundColors = [
                '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                '#5a5c69', '#858796', '#3a3b45', '#f8f9fc', '#d1d3e2'
            ];

            const configuration: ChartConfiguration<'doughnut'> = {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            // display: true,
                            // text: `Website Visitor Locations (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const country = context.label || '';
                                    const visitors = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percent = ((Number(visitors) / total) * 100).toFixed(1);
                                    return `${country}: ${visitors} visitors (${percent}%)`;
                                }
                            }
                        },
                        legend: {
                            labels: {
                                //  Optional: Uncomment below to append percentage in legend label
                                // generateLabels: (chart) => chart.data.labels.map((label, i) => {
                                //     const val = chart.data.datasets[0].data[i] as number;
                                //     const percent = ((val / totalVisitors) * 100).toFixed(1);
                                //     return {
                                //         text: `${label} (${percent}%)`,
                                //         fillStyle: chart.data.datasets[0].backgroundColor[i],
                                //         strokeStyle: '#fff',
                                //         lineWidth: 1,
                                //         index: i
                                //     };
                                // })
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return {
                title: `Website Visitor Locations (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            };
        } catch (error) {
            console.error('Error generating website locations chart:', error);
            return { title: 'Website Visitor Locations', image: null };
        }
    }

    private getPlatformColor(platform: string): string {
        const colors: Record<string, string> = {
            instagram: 'rgba(193, 53, 132, 1)',
            youtube: 'rgba(255, 0, 0, 1)',
            facebook: 'rgba(24, 119, 242, 1)',
            linkedin: 'rgba(10, 102, 194, 1)',
            x: 'rgba(29, 161, 242, 1)',
            gbp: 'rgba(66, 133, 244, 1)',     // Google Blue
            website: 'rgba(46, 204, 113, 1)'  // Green (custom, can be changed)
        };
        return colors[platform.toLowerCase()] || 'rgba(54, 162, 235, 1)';
    }

    //     private generateCombinedReportHtml(options: {
    //         platformReports: PlatformReport[];
    //         logoDataUri: string;
    //         month: string;
    //         customerName: string;
    //     }): string {
    //         const currentDate = format(new Date(), 'MMM d, yyyy');

    //         return `<!DOCTYPE html>
    // <html>
    // <head>
    //     <meta charset="UTF-8">
    //     <style>
    //         @page {
    //             margin: 0;
    //         }

    //         body {
    //             margin: 0;
    //             padding: 30px 40px;
    //             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    //             color: #2c3e50;
    //             line-height: 1.6;
    //             background-color: #fff;
    //         }

    //         .logo-container {
    //             text-align: center;
    //             margin-bottom: 20px;
    //         }

    //         .logo {
    //             height: 300px;
    //             width: 300px;
    //         }

    //         .header {
    //             text-align: center;
    //             margin-bottom: 40px;
    //         }

    //         .header h1 {
    //             font-size: 32px;
    //             margin-bottom: 10px;
    //             font-weight: 700;
    //         }

    //         .header p {
    //             color: #7f8c8d;
    //             font-size: 16px;
    //             margin: 5px 0;
    //         }

    //         .customer-id {
    //             display: inline-block;
    //             margin-top: 15px;
    //             background-color: #ecf0f1;
    //             padding: 10px 20px;
    //             border-radius: 6px;
    //             font-size: 18px;
    //             font-weight: 600;
    //             color: #34495e;
    //         }

    //         .intro-page {
    //             height: 100vh;
    //             display: flex;
    //             flex-direction: column;
    //             justify-content: center;
    //             align-items: center;
    //             page-break-after: always;
    //         }

    //         .platform-section {
    //             margin-bottom: 60px;
    //             page-break-after: always;
    //         }

    //         .platform-title {
    //             display: flex;
    //             align-items: center;
    //             font-size: 24px;
    //             font-weight: 700;
    //             border-bottom: 2px solid #3498db;
    //             padding-bottom: 10px;
    //             margin-bottom: 30px;
    //         }

    //         .platform-icon {
    //             width: 28px;
    //             height: 28px;
    //             margin-right: 12px;
    //         }

    //         .section {
    //             margin-bottom: 40px;
    //         }

    //         .section-title {
    //             font-size: 20px;
    //             font-weight: 600;
    //             margin-bottom: 20px;
    //             padding-left: 10px;
    //             border-left: 5px solid #2980b9;
    //             color: #2c3e50;
    //         }

    //         table {
    //             width: 100%;
    //             border-collapse: collapse;
    //             margin-bottom: 20px;
    //             page-break-inside: avoid;
    //         }

    //         th, td {
    //             padding: 14px 18px;
    //             text-align: center;
    //             border-bottom: 1px solid #e5e5e5;
    //             font-size: 14px;
    //         }

    //         th {
    //             background-color: #f0f4f7;
    //             text-transform: uppercase;
    //             font-weight: 600;
    //             color: #34495e;
    //         }

    //         td.metric-name {
    //             text-align: left;
    //             font-weight: 600;
    //             color: #2c3e50;
    //         }

    //         tr:nth-child(even) {
    //             background-color: #fafafa;
    //         }

    //         .bold-row {
    //             font-weight: bold;
    //         }

    //         .total-content-row {
    //             background-color: #eaf6ff;
    //             border-top: 2px solid #3498db;
    //         }

    //         .positive {
    //             color: #27ae60;
    //             font-weight: 600;
    //         }

    //         .negative {
    //             color: #e74c3c;
    //             font-weight: 600;
    //         }

    //         .growth-text {
    //             font-style: italic;
    //             color: #7f8c8d;
    //             font-size: 14px;
    //             margin-top: -10px;
    //             margin-bottom: 30px;
    //         }

    //         .chart-container {
    //             margin: 20px 0 50px;
    //             page-break-inside: avoid;
    //         }

    //         .chart-title {
    //             font-size: 16px;
    //             font-weight: 500;
    //             text-align: center;
    //             margin-bottom: 12px;
    //             color: #2d3436;
    //         }

    //         .chart-img {
    //             width: 100%;
    //             height: auto;
    //             display: block;
    //             margin: 0 auto;
    //             object-fit: contain;
    //         }

    //         .footer {
    //             text-align: center;
    //             font-size: 12px;
    //             color: #95a5a6;
    //             border-top: 1px solid #eee;
    //             padding-top: 20px;
    //             margin-top: 60px;
    //         }
    //     </style>
    // </head>
    // <body>
    //     <div class="intro-page">
    //         <div class="logo-container">
    //             <img src="${options.logoDataUri}" class="logo" alt="Company Logo" />
    //         </div>
    //         <div class="header">
    //             <h1>Social Media Analytics Report</h1>
    //             <p>For ${options.month} | Generated on ${currentDate}</p>
    //             <div class="customer-id">${options.customerName}</div>
    //         </div>
    //     </div>

    //     ${options.platformReports.map(platform => {
    //             const combinedSections: string[] = [];
    //             const tables = platform.tables || [];
    //             const charts = platform.charts || [];
    //             const max = Math.max(tables.length, charts.length);

    //             for (let i = 0; i < max; i++) {
    //                 const table = tables[i];
    //                 const chart = charts[i];

    //                 if (table && table.rows?.length > 0) {
    //                     combinedSections.push(`
    //                 <div class="section" style="${table.title.toLowerCase().includes('overview') ? 'page-break-before: always;' : ''}">
    //                     <div class="section-title">${table.title}</div>
    //                     <table class="${table.style || 'detailed'}-table">
    //                         <thead>
    //                             <tr>
    //                                 ${table.headers.map(h => `<th>${h}</th>`).join('')}
    //                             </tr>
    //                         </thead>
    //                         <tbody>
    //                             ${table.rows.map(row => `
    //                                 <tr${row[0].toLowerCase().includes('total content') ? ' class="bold-row total-content-row"' : ''}>
    //                                     ${row.map((cell, i) => {
    //                         if (i === 0) {
    //                             return `<td class="metric-name">${cell}</td>`;
    //                         } else if (i === row.length - 1) {
    //                             const isPositive = cell && !cell.includes('-') && cell !== '0%' && cell !== 'N/A';
    //                             return `<td class="${isPositive ? 'positive' : cell === '0%' || cell === 'N/A' ? '' : 'negative'}">${cell}</td>`;
    //                         } else {
    //                             return `<td>${cell}</td>`;
    //                         }
    //                     }).join('')}
    //                                 </tr>
    //                             `).join('')}
    //                         </tbody>
    //                     </table>
    //                     ${table.growthText ? `<div class="growth-text">${table.growthText}</div>` : ''}
    //                 </div>
    //                 `);
    //                 }

    //                 if (chart && chart.image) {
    //                     combinedSections.push(`
    //                 <div class="chart-container">
    //                     <div class="chart-title">${chart.title}</div>
    //                     <img src="${chart.image}" class="chart-img" />
    //                 </div>
    //                 `);
    //                 }
    //             }

    //             return `
    //         <div class="platform-section">
    //             <div class="platform-title">
    //                 <img src="${this.getPlatformIconDataUri(platform.name)}" class="platform-icon" alt="${platform.name}" />
    //                 ${platform.name}
    //             </div>
    //             ${combinedSections.join('')}
    //         </div>
    //         `;
    //         }).join('')}

    //     <div class="footer">
    //         <p>© ${new Date().getFullYear()} Upstrapp. All rights reserved.</p>
    //         <p>This report was automatically generated on ${currentDate}</p>
    //     </div>
    // </body>
    // </html>`;
    //     }

    private generateCombinedReportHtml(options: {
        platformReports: PlatformReport[];
        logoDataUri: string;
        month: string;
        customerName: string;
    }): string {
        const currentDate = format(new Date(), 'MMM d, yyyy');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 0;
        }

        body {
            margin: 0;
            padding: 30px 40px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #2c3e50;
            line-height: 1.6;
            background-color: #fff;
        }

        .logo-container {
            text-align: center;
            margin-bottom: 20px;
        }

        .logo {
            height: 100px;
            width: auto;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header p {
            color: #7f8c8d;
            font-size: 16px;
            margin: 5px 0;
        }

        .customer-id {
            display: inline-block;
            margin-top: 15px;
            background-color: #ecf0f1;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 18px;
            font-weight: 600;
            color: #34495e;
        }

        .intro-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            page-break-after: always;
        }

        .platform-section {
            margin-bottom: 60px;
            page-break-after: always;
        }

        .platform-title {
            display: flex;
            align-items: center;
            font-size: 24px;
            font-weight: 700;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }

        .platform-icon {
            width: 28px;
            height: 28px;
            margin-right: 12px;
        }

        .section {
            margin-bottom: 40px;
        }

        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-left: 10px;
            border-left: 5px solid #2980b9;
            color: #2c3e50;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        th, td {
            padding: 14px 18px;
            text-align: center;
            border-bottom: 1px solid #e5e5e5;
            font-size: 14px;
        }

        th {
            background-color: #f0f4f7;
            text-transform: uppercase;
            font-weight: 600;
            color: #34495e;
        }

        td.metric-name {
            text-align: left;
            font-weight: 600;
            color: #2c3e50;
        }

        tr:nth-child(even) {
            background-color: #fafafa;
        }

        .bold-row {
            font-weight: bold;
        }

        .total-content-row {
            background-color: #eaf6ff;
            border-top: 2px solid #3498db;
        }

        .positive {
            color: #27ae60;
            font-weight: 600;
        }

        .negative {
            color: #e74c3c;
            font-weight: 600;
        }

        .growth-text {
            font-style: italic;
            color: #7f8c8d;
            font-size: 14px;
            margin-top: -10px;
            margin-bottom: 30px;
        }

        .chart-container {
            margin: 20px 0 50px;
            page-break-inside: avoid;
        }

        .chart-title {
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            margin-bottom: 12px;
            color: #2d3436;
        }

        .chart-img {
            width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
            object-fit: contain;
        }

        .footer {
            text-align: center;
            font-size: 12px;
            color: #95a5a6;
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 60px;
        }
    </style>
</head>
<body>
    <div class="intro-page">
        <div class="logo-container">
            <img src="${options.logoDataUri}" class="logo" alt="Company Logo" />
        </div>
        <div class="header">
            <h1>Social Media Analytics Report</h1>
            <p>For ${options.month} | Generated on ${currentDate}</p>
            <div class="customer-id">${options.customerName}</div>
        </div>
    </div>

    ${options.platformReports.map(platform => {
            const combinedSections: string[] = [];
            const tables = platform.tables || [];
            const charts = platform.charts || [];
            const max = Math.max(tables.length, charts.length);

            for (let i = 0; i < max; i++) {
                const table = tables[i];
                const chart = charts[i];

                if (table && table.rows?.length > 0) {
                    combinedSections.push(`
                <div class="section" style="${table.title.toLowerCase().includes('overview') ? 'page-break-before: always;' : ''}">
                    <div class="section-title">${table.title}</div>
                    <table class="${table.style || 'detailed'}-table">
                        <thead>
                            <tr>
                                ${table.headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${table.rows.map(row => `
                                <tr${row[0].toLowerCase().includes('total content') ? ' class="bold-row total-content-row"' : ''}>
                                    ${row.map((cell, i) => {
                        if (i === 0) {
                            return `<td class="metric-name">${cell}</td>`;
                        } else if (i === row.length - 1) {
                            const isPositive = cell && !cell.includes('-') && cell !== '0%' && cell !== 'N/A';
                            return `<td class="${isPositive ? 'positive' : cell === '0%' || cell === 'N/A' ? '' : 'negative'}">${cell}</td>`;
                        } else {
                            return `<td>${cell}</td>`;
                        }
                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${table.growthText ? `<div class="growth-text">${table.growthText}</div>` : ''}
                </div>
                `);
                }

                if (chart && chart.image) {
                    combinedSections.push(`
                <div class="chart-container">
                    <div class="chart-title">${chart.title}</div>
                    <img src="${chart.image}" class="chart-img" />
                </div>
                `);
                }
            }

            return `
        <div class="platform-section">
            <div class="platform-title">
                <img src="${this.getPlatformIconDataUri(platform.name)}" class="platform-icon" alt="${platform.name}" />
                ${platform.name}
            </div>
            ${combinedSections.join('')}
        </div>
        `;
        }).join('')}

    <div class="footer">
        <p>© ${new Date().getFullYear()} Upstrapp. All rights reserved.</p>
        <p>This report was automatically generated on ${currentDate}</p>
    </div>
</body>
</html>`;
    }

    private getPlatformIconDataUri(platformName: string): string {
        const icons: Record<string, string> = {
            'Instagram': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E1306C">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>`,
            'YouTube': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF0000">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>`,
            'Facebook': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z"/>
        </svg>`,
            'LinkedIn': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>`,
            'X (Twitter)': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>`,
            'GBP': `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#4285F4" viewBox="0 0 16 16">
  <path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
</svg>`
            ,
            'Website': `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#2ECC71" viewBox="0 0 16 16">
  <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
</svg>`

        };

        const iconSvg = icons[platformName] || `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#95a5a6">
        <circle cx="12" cy="12" r="10"/>
    </svg>`;

        return `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;
    }

    private generateNoDataHtml(logoDataUri: string, month: string, customerName: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 0;
        }
       body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #333;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh; /* full page */
    text-align: center;
}

        .logo-container {
            margin: 0;
            padding: 0;
            text-align: center;
        }
  .logo {
    height: auto;
    max-height: 150px; /* or more */
    width: auto;
    transform: scale(2); /* doubles the visible size */
    margin-bottom: 10px;
}

        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            margin: 0;
            color: #2c3e50;
            font-weight: 600;
        }
        .header p {
            margin: 5px 0 0;
            color: #7f8c8d;
            font-size: 16px;
        }
        .customer-id {
            background: #f8f9fa;
            padding: 8px 15px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 10px;
            font-size: 14px;
        }
        .no-data-message {
            text-align: center;
            margin: 50px 0;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .no-data-message h2 {
            color: #7f8c8d;
            font-weight: 500;
        }
        .no-data-message p {
            color: #95a5a6;
            max-width: 500px;
            margin: 0 auto;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            color: #95a5a6;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
    </style>
</head>
<body>
   <div class="logo-container" style="text-align: center;">
  <img src="${logoDataUri}" alt="Company Logo" style="height: 100px; width: auto; display: inline-block;" />
</div>


    <div class="header">
        <h1>Social Media Analytics Report</h1>
        <p>For ${month} | Generated on ${format(new Date(), 'MMM d, yyyy')}</p>
        <div class="customer-id">${customerName}</div>
    </div>

    <div class="no-data-message">
        <h2>No Data Available</h2>
        <p>No social media data was found for the selected period. Please ensure your accounts are properly connected and have data for ${month}.</p>
    </div>

    <div class="footer">
        <p>© ${new Date().getFullYear()} Upstrapp. All rights reserved.</p>
        <p>This report was automatically generated on ${format(new Date(), 'MMM d, yyyy')}</p>
    </div>
</body>
</html>`;
    }

    private async generateAndSendPdf(
        res: Response,
        html: string,
        platform: string,
        customerId: string,
        period: string
    ) {
        let browser;
        try {
            console.log('Starting PDF generation...');

            browser = await playwright.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('Browser launched');

            const context = await browser.newContext();
            const page = await context.newPage();
            console.log('New page created');

            await page.setContent(html, { waitUntil: 'networkidle0' });
            console.log('Content set');

            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '0.5in',
                    right: '0.5in',
                    bottom: '0.5in',
                    left: '0.5in'
                },
                printBackground: true,
                preferCSSPageSize: true,  // Important for proper sizing

                //timeout: 60000 // Increase timeout to 60 seconds

            });
            console.log('PDF generated');

            // Save to file for inspection (optional)
            fs.writeFileSync('debug-report-playwright.pdf', pdfBuffer);
            console.log('PDF saved to debug-report-playwright.pdf');


            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${platform}-report-${customerId}-${period}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.send(pdfBuffer)
            console.log('Browser closed');

        } catch (err) {
            console.error('PDF generation error:', err);
            res.status(500).send('Error generating PDF: ' + err.message);
        } finally {
            if (browser) await browser.close();
        }
    }

}