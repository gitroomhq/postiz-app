import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MonthlyReportService } from '../../services/report/monthly-report.service';
import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ChartDataset } from 'chart.js';
import * as playwright from 'playwright';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables, annotationPlugin);

interface MetricSummary {
    value: string | number;
    style?: {
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        textColor?: string;
    };
}


interface ChartData {
    title: string;
    date?: string;
    image: string | null;
    summary?: any;
}

interface TableData {
    title: string;
    headers: string[];
    rows: string[][];
    growthText?: string;
    style?: 'simple' | 'detailed' | 'hospital';
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
        @Query('hospital') hospital: string,
        @Res() res: Response
    ) {
        try {
            if (!customerId) throw new BadRequestException('customerId is required');
            if (!month || !year) throw new BadRequestException('Month and year are required');
            const { name: customerName, brandLogo } = await this.reportService.getCustomerInfo(customerId);
            console.log('brandLogo', brandLogo);


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
                website: website === 'true',
                hospital: hospital === 'true'
            };

            const platformReports: PlatformReport[] = [];

            // GBP first (as per your requested order)
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
                        { type: 'engagement', generator: this.generateGBPEngagementChart.bind(this) },
                        { type: 'reviews', generator: this.generateGBPReviewsChart.bind(this) } // ✅ Add this

                    ]
                );
                if (gbpPerformance) platformReports.push(gbpPerformance);
            }

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

            // Thread platform (assuming this needs to be added similar to other platforms)
            // Note: Thread processing logic not found in current code, keeping placeholder
            // if (platforms.thread) {
            //     const threadReport = await this.processPlatform(
            //         'thread',
            //         customerId,
            //         monthNum,
            //         yearNum,
            //         [
            //             { type: 'community', serviceMethod: 'getThreadCommunityReport' },
            //             { type: 'overview', serviceMethod: 'getThreadOverviewReport' }
            //         ],
            //         [
            //             { type: 'community', generator: this.generateThreadCommunityChart.bind(this) },
            //             { type: 'impressions', generator: this.generateThreadImpressionsChart.bind(this) }
            //         ]
            //     );
            //     if (threadReport) platformReports.push(threadReport);
            // }

            if (platforms.youtube) {
                const youtubeReport = await this.processPlatform(
                    'youtube',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'community', serviceMethod: 'getYoutubeCommunityReport' },
                        //  { type: 'overview', serviceMethod: 'getYoutubeOverviewReport' }
                    ],
                    [
                        { type: 'subscribers', generator: this.generateSubscribersChart.bind(this) },
                        //{ type: 'views', generator: this.generateViewsChart.bind(this) }
                    ]
                );
                if (youtubeReport) platformReports.push(youtubeReport);
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
                        { type: 'followers', generator: this.generateFollowersChart.bind(this) },
                        { type: 'impressions', generator: this.generateXOverviewChart.bind(this) }
                    ]
                );
                if (xReport) platformReports.push(xReport);
            }

            if (platforms.linkedin) {
                const linkedinReport = await this.processPlatform(
                    'linkedin',
                    customerId,
                    monthNum,
                    yearNum,
                    [
                        { type: 'community', serviceMethod: 'getLinkedInCommunityReport' },
                        // { type: 'overview', serviceMethod: 'getLinkedInOverviewReport' }
                    ],
                    [
                        // { type: 'followers', generator: this.generateFollowersChart.bind(this) },
                        { type: 'impressions', generator: this.generateLinkedInCommunityChart.bind(this) }
                    ]
                );
                if (linkedinReport) platformReports.push(linkedinReport);
            }

            // Pinterest platform (assuming this needs to be added similar to other platforms)
            // Note: Pinterest processing logic not found in current code, keeping placeholder
            // if (platforms.pinterest) {
            //     const pinterestReport = await this.processPlatform(
            //         'pinterest',
            //         customerId,
            //         monthNum,
            //         yearNum,
            //         [
            //             { type: 'community', serviceMethod: 'getPinterestCommunityReport' },
            //             { type: 'overview', serviceMethod: 'getPinterestOverviewReport' }
            //         ],
            //         [
            //             { type: 'community', generator: this.generatePinterestCommunityChart.bind(this) },
            //             { type: 'impressions', generator: this.generatePinterestImpressionsChart.bind(this) }
            //         ]
            //     );
            //     if (pinterestReport) platformReports.push(pinterestReport);
            // }

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

            if (platforms.hospital) {
                console.log('Hospital platform is enabled - creating 2 empty pages');

                // Create 2 empty pages for hospital
                const hospitalReport: PlatformReport = {
                    name: 'Hospital',
                    tables: [
                        {
                            title: 'PATIENT FOOTFALL',
                            headers: ['Month', 'Data', 'Change %'],
                            rows: [
                                ['', '', ''],
                                ['', '', ''],
                                ['', '', '']
                            ],
                            style: 'hospital'
                        },
                        {
                            title: `What's Next ?`,
                            headers: [],
                            rows: [],
                            style: 'hospital'
                        }
                    ],
                    charts: []
                };

                platformReports.push(hospitalReport);
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

            const footerBorderPath = path.join(__dirname, 'assets', 'Footer-border.png');
            if (!fs.existsSync(footerBorderPath)) {
                throw new Error('Footer border file not found');
            }

            const footerBorderBase64 = fs.readFileSync(footerBorderPath, 'base64');
            const footerBorderDataUri = `data:image/png;base64,${footerBorderBase64}`;

            const monthDisplay = format(currentMonthStart, 'MMMM yyyy');

            const html = platformReports.length > 0
                ? this.generateCombinedReportHtml({
                    platformReports,
                    logoDataUri,
                    footerBorderDataUri,
                    month: monthDisplay,
                    customerName,
                    brandLogo: brandLogo // Using logoDataUri as brandLogo
                })
                : this.generateNoDataHtml(logoDataUri, footerBorderDataUri, monthDisplay, customerName);

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
                    // In the processPlatform method, add logging for hospital data:
                    if (platform === 'hospital') {
                        console.log('Hospital table data:', data)
                    }
                    const table = platform === 'hospital' ? data : data.table;

                    if (data && table) {
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
            x: 'X (Twitter)',
            gbp: 'Google Business Profile',
            website: 'Website',
            hospital: 'Hospital' // ✅ Add this
        };
        return platformNames[platform.toLowerCase()] || platform;
    }

    private createDetailedTable(title: string, tableData: any, platform: string, reportMonth: number, reportYear: number): TableData | null {
        if (!tableData || !tableData.Data || !tableData.Rows || tableData.Rows.length === 0) {
            console.log(`No valid table data for ${platform} ${title}`, tableData);
            return null;
        }

        // Special handling for hospital platform
        if (platform === 'hospital') {
            return {
                title: 'Hospital Patient Statistics',
                headers: tableData.Data,
                rows: tableData.Rows,
                growthText: tableData.Growth,
                style: 'hospital' // Special style identifier
            };
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
                { key: 'Impressions', label: 'Impressions' },
                { key: 'Posts', label: 'Posts' },


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

        if (['youtube', 'linkedin'].includes(platform.toLowerCase())) {
            filteredRows = filteredRows.filter(row =>
                !row[0].toLowerCase().includes('total content'));
        }
        else if (['instagram', 'facebook', 'x'].includes(platform.toLowerCase())) {
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

    private async generateLinkedInCommunityChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'linkedin',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.community;
            if (!report) {
                report = await this.reportService.getLinkedInCommunityReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'LinkedIn Community Growth', image: null };
            }

            // Use latest data for summary
            const latestData = report.latestData || {
                followers: 0,
                paidFollowers: 0,
                postsCount: 0,
                impressions: 0
            };

            const monthData = report.chart
                .map(d => ({ ...d, date: new Date(d.date || d.createdAt) }))
                .filter(d => d.date.getMonth() + 1 === month && d.date.getFullYear() === year)
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            if (!monthData.length) {
                return { title: 'LinkedIn Community Growth', image: null };
            }

            /* Sampling logic */
            const daysInMonth = new Date(year, month, 0).getDate();
            const interval = Math.max(1, Math.floor(daysInMonth / 10));
            const sampledData: any[] = [];

            for (let day = 1; day <= daysInMonth; day += interval) {
                let closest: any = null;
                let minDiff = Infinity;

                for (const item of monthData) {
                    const diff = Math.abs(item.date.getDate() - day);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = item;
                    }
                }
                if (closest) sampledData.push(closest);
            }

            const lastDayData = monthData.find(d => d.date.getDate() === daysInMonth);
            if (lastDayData && !sampledData.some(d => d.date.getDate() === daysInMonth)) {
                sampledData.push(lastDayData);
            }

            const labels = sampledData.map(d => format(d.date, 'MMM d'));

            /* Chart datasets */
            const datasets: ChartDataset<'bar' | 'line'>[] = [
                {
                    type: 'line',
                    label: 'Followers',
                    data: sampledData.map(d => d.followers || 0),
                    borderColor: '#0A66C2',
                    backgroundColor: '#0A66C230',
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: '#0A66C2',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Paid Followers',
                    data: sampledData.map(d => d.paidFollowers || 0),
                    borderColor: '#FFB002',
                    backgroundColor: '#FFB00230',
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: '#FFB002',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Impressions',
                    data: sampledData.map(d => d.impressions || 0),
                    borderColor: '#8D6CAB',
                    backgroundColor: '#8D6CAB30',
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: '#8D6CAB',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'Posts',
                    data: sampledData.map(d => d.postsCount || 0),
                    backgroundColor: '#29C76F',
                    borderColor: '#29C76F',
                    borderWidth: 1,
                    borderRadius: 6,
                    barThickness: 14,
                    yAxisID: 'y'
                }
            ];

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (items) =>
                                    format(
                                        sampledData[items[0].dataIndex].date,
                                        'MMMM d, yyyy'
                                    ),
                                label: (ctx) =>
                                    `${ctx.dataset.label}: ${Number(
                                        ctx.parsed.y
                                    ).toLocaleString()}`
                            }
                        }
                    },
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                font: { weight: 'bold' }
                            },
                            ticks: { autoSkip: false }
                        },
                        y: {
                            beginAtZero: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Count',
                                font: { weight: 'bold' }
                            },
                            ticks: {
                                callback: (value) =>
                                    Number(value) >= 1000
                                        ? `${(Number(value) / 1000).toFixed(0)}k`
                                        : value
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            // Get start and end dates from the data
            const startDate = monthData.length > 0 ? format(monthData[0].date, 'MMM d, yyyy') : '';
            const endDate = monthData.length > 0 ? format(monthData[monthData.length - 1].date, 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? ` (${startDate} - ${endDate})` : '';

            return {
                title: `Community Growth`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    Followers: {
                        value: latestData.followers.toLocaleString(),
                        style: {
                            backgroundColor: '#0A66C230',
                            borderColor: '#0A66C2',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    PaidFollowers: {
                        value: latestData.paidFollowers.toLocaleString(),
                        style: {
                            backgroundColor: '#FFB00230',
                            borderColor: '#FFB002',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    Impressions: {
                        value: latestData.impressions.toLocaleString(),
                        style: {
                            backgroundColor: '#8D6CAB30',
                            borderColor: '#8D6CAB',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    Posts: {
                        value: latestData.postsCount.toLocaleString(),
                        style: {
                            backgroundColor: '#29C76F30',
                            borderColor: '#29C76F',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };
        } catch (error) {
            console.error('Error generating LinkedIn community chart:', error);
            return { title: 'LinkedIn Community Growth', image: null };
        }
    }


    private async generateXOverviewChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'x',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.overview;
            if (!report) {
                report = await this.reportService.getXOverviewReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'X Performance Metrics', image: null };
            }

            // Use latest data for summary
            const latestData = report.latestData || {
                impressions: 0,
                engagement: 0,
                interactions: 0
            };

            const monthData = this.formatChartData(report.chart, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const impressionsData = sampledData.map(d => d.impressions || 0);
            const interactionsData = sampledData.map(d => d.interactions || 0);
            const engagementData = sampledData.map(d => d.engagement || 0);

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Impressions',
                            data: impressionsData,
                            backgroundColor: '#1DA1F280',
                            borderColor: '#1DA1F2',
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6
                        },
                        {
                            type: 'line',
                            label: 'Engagement Rate',
                            data: engagementData,
                            borderColor: '#17BF63',
                            backgroundColor: '#17BF6320',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#17BF63',
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            yAxisID: 'y1'
                        },
                        {
                            type: 'line',
                            label: 'Interactions',
                            data: interactionsData,
                            borderColor: '#F45D22',
                            backgroundColor: '#F45D2220',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#F45D22',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                            labels: {
                                font: { size: 12 },
                                color: '#202124',
                                boxWidth: 20,
                                boxHeight: 12,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    const date = new Date(sampledData[tooltipItems[0].dataIndex].date);
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#5f6368',
                                font: { size: 11 }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count',
                                font: { size: 12 },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368'
                            },
                            grid: {
                                color: '#e0e0e0'
                            }
                        },
                        y1: {
                            position: 'right',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Engagement Rate (%)',
                                font: { size: 12 },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368',
                                callback: (value) => `${Number(value).toFixed(2)}%`
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                },
                plugins: [require('chartjs-plugin-annotation')]
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            // Get start and end dates from the data
            const startDate = monthData.length > 0 ? format(new Date(monthData[0].date), 'MMM d, yyyy') : '';
            const endDate = monthData.length > 0 ? format(new Date(monthData[monthData.length - 1].date), 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? ` (${startDate} - ${endDate})` : '';

            return {
                title: `Performance Growth`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    impressions: {
                        value: latestData.impressions.toLocaleString(),
                        style: {
                            backgroundColor: '#1DA1F220',
                            borderColor: '#1DA1F2',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    interactions: {
                        value: latestData.interactions.toLocaleString(),
                        style: {
                            backgroundColor: '#F45D2220',
                            borderColor: '#F45D22',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    Engagement: {
                        value: `${latestData.engagement.toFixed(2)}%`,
                        style: {
                            backgroundColor: '#17BF6320',
                            borderColor: '#17BF63',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };
        } catch (error) {
            console.error('Error generating X overview chart:', error);
            return { title: 'X Performance Metrics', image: null };
        }
    }


    // Instagram
    private async generateCommunityChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'instagram',
        preloadedData?: any
    ): Promise<ChartData | null> {
        try {
            let report = preloadedData?.community;

            if (!report) {
                report = await this.reportService.getInstagramCommunityReport(customerId, month, year);
                if (!report?.chart?.length) {
                    console.log(`No chart data for Instagram community report`);
                    return null;
                }
            }

            const monthData = report.chart.filter(item => {
                const date = new Date(item.date);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });

            monthData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const sampledData = [];
            const daysInMonth = new Date(year, month, 0).getDate();
            const dayInterval = 4;

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

            const lastDayData = monthData.find(item => new Date(item.date).getDate() === daysInMonth);
            if (lastDayData && !sampledData.some(item => new Date(item.date).getDate() === daysInMonth)) {
                sampledData.push(lastDayData);
            }

            const labels = sampledData.map(item => format(new Date(item.date), 'MMM d'));

            // Rounded Bar Patch
            const ctx = (this.chartJSNodeCanvas as any)?._canvas?.getContext?.('2d');
            if (ctx && typeof ctx.roundRect !== 'function') {
                ctx.roundRect = function (x, y, w, h, r) {
                    this.beginPath();
                    this.moveTo(x + r, y);
                    this.arcTo(x + w, y, x + w, y + h, r);
                    this.arcTo(x + w, y + h, x, y + h, r);
                    this.arcTo(x, y + h, x, y, r);
                    this.arcTo(x, y, x + w, y, r);
                    this.closePath();
                };
            }

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Following',
                            data: sampledData.map(item => item.following || 0),
                            backgroundColor: '#833AB430',
                            borderColor: '#833AB4',
                            borderWidth: 2,
                            type: 'bar',
                            barThickness: 14,
                            borderRadius: 6
                        },
                        {
                            label: 'Followers',
                            data: sampledData.map(item => item.followers || 0),
                            borderColor: '#C13584',
                            backgroundColor: '#C1358420',
                            borderWidth: 2,
                            type: 'line',
                            tension: 0.4,
                            fill: false,
                            pointBackgroundColor: '#C13584',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        },
                        {
                            label: 'Contents',
                            data: sampledData.map(item => item.totalContent || 0),
                            borderColor: '#FCAF45',
                            backgroundColor: '#FCAF4520',
                            borderWidth: 2,
                            type: 'line',
                            tension: 0.4,
                            fill: false,
                            pointBackgroundColor: '#FCAF45',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    const date = new Date(sampledData[items[0].dataIndex].date);
                                    return format(date, 'MMMM d, yyyy');
                                }
                            }
                        },
                        legend: {
                            display: false,
                            labels: {
                                font: { size: 12 },
                                boxWidth: 20,
                                boxHeight: 12,
                                padding: 20
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#5f6368', font: { size: 11 } }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count',
                                font: { size: 12 },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368',
                                callback: (v) => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                            },
                            grid: { color: '#e0e0e0' }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            // Get latest data from the report
            const latestData = report.latestData || {
                followers: 0,
                following: 0,
                totalContent: 0
            };

            // Get start and end dates from the data
            const startDate = monthData.length > 0 ? format(new Date(monthData[0].date), 'MMM d, yyyy') : '';
            const endDate = monthData.length > 0 ? format(new Date(monthData[monthData.length - 1].date), 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? ` (${startDate} - ${endDate})` : '';

            const summary = {
                Followers: {
                    value: latestData.followers.toLocaleString(),
                    style: {
                        backgroundColor: '#C1358430',
                        borderColor: '#C13584',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                Following: {
                    value: latestData.following.toLocaleString(),
                    style: {
                        backgroundColor: '#833AB430',
                        borderColor: '#833AB4',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                totalContent: {
                    value: latestData.totalContent.toLocaleString(),
                    style: {
                        backgroundColor: '#FCAF4530',
                        borderColor: '#FCAF45',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                }
            };

            return {
                title: `Community Growth`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary
            };
        } catch (error) {
            console.error(`Error generating Instagram community chart:`, error);
            return null;
        }
    }

    async generateInstagramImpressionsChart(
        customerId: string,
        month: number,
        year: number,
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            const report = preloadedData?.overview || await this.reportService.getInstagramOverviewReport(customerId, month, year);
            if (!report?.chart?.length) {
                return { title: 'Instagram Impressions & Reach', image: null };
            }

            // Use the latest data for summary instead of calculating totals
            const latestData = report.latestData || {
                impressions: 0,
                avgReachPerDay: 0,
                totalContent: 0
            };

            const rawChartData = report.chart.map(item => ({
                date: new Date(item.date || item.createdAt),
                impressions: item.impressions || 0,
                avgReachPerDay: item.avgReachPerDay || 0,
                totalContent: item.totalContent || 0
            }));

            const daysInMonth = new Date(year, month, 0).getDate();
            const completeData = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const found = rawChartData.find(d =>
                    d.date.getDate() === day &&
                    d.date.getMonth() + 1 === month &&
                    d.date.getFullYear() === year
                );
                return found
                    ? { ...found, day, isActualData: true }
                    : {
                        date: new Date(year, month - 1, day),
                        impressions: 0,
                        avgReachPerDay: 0,
                        totalContent: 0,
                        day,
                        isActualData: false
                    };
            });

            const sampledData = [];
            for (let i = 0; i < daysInMonth; i += 4) {
                sampledData.push(completeData[i]);
            }
            if (!sampledData.some(d => d.day === daysInMonth)) {
                sampledData.push(completeData[daysInMonth - 1]);
            }

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const impressionsData = sampledData.map(d => d.impressions);
            const reachData = sampledData.map(d => d.avgReachPerDay);
            const totalContentData = sampledData.map(d => d.totalContent);

            // Monkey patch roundRect
            const testCanvas = (this.chartJSNodeCanvas as any)._canvas;
            const ctx = testCanvas?.getContext?.('2d');
            if (ctx && typeof ctx.roundRect !== 'function') {
                ctx.roundRect = function (x, y, w, h, r) {
                    this.beginPath();
                    this.moveTo(x + r, y);
                    this.arcTo(x + w, y, x + w, y + h, r);
                    this.arcTo(x + w, y + h, x, y + h, r);
                    this.arcTo(x, y + h, x, y, r);
                    this.arcTo(x, y, x + w, y, r);
                    this.closePath();
                };
            }

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Impressions',
                            data: impressionsData,
                            backgroundColor: '#FD1D1D90',
                            borderColor: '#FD1D1D',
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6
                        },
                        {
                            type: 'line',
                            label: 'Avg Reach/Day',
                            data: reachData,
                            borderColor: '#833AB4',
                            backgroundColor: '#833AB420',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#833AB4',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        },
                        {
                            type: 'line',
                            label: 'Total Content',
                            data: totalContentData,
                            borderColor: '#FCAF45',
                            backgroundColor: '#FCAF4520',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#FCAF45',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                            labels: {
                                font: { size: 12 },
                                color: '#202124',
                                boxWidth: 20,
                                boxHeight: 12,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    const date = sampledData[items[0].dataIndex].date;
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: (ctx) => {
                                    const value = ctx.parsed.y;
                                    const label = ctx.dataset.label || '';
                                    return `${label}: ${Number(value).toLocaleString()}${sampledData[ctx.dataIndex].isActualData ? '' : ' (estimated)'}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#5f6368',
                                font: { size: 11 }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count',
                                font: { size: 12 },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368',
                                callback: (v) => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v
                            },
                            grid: {
                                color: '#e0e0e0'
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            // Get start and end dates from the data
            const startDate = completeData.length > 0 ? format(completeData[0].date, 'MMM d, yyyy') : '';
            const endDate = completeData.length > 0 ? format(completeData[completeData.length - 1].date, 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? ` (${startDate} - ${endDate})` : '';

            return {
                title: `Performance Growth`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    impressions: {
                        value: latestData.impressions.toLocaleString(),
                        style: {
                            backgroundColor: '#FD1D1D20',
                            borderColor: '#FD1D1D',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    reach: {
                        value: latestData.avgReachPerDay.toLocaleString(),
                        style: {
                            backgroundColor: '#833AB420',
                            borderColor: '#833AB4',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    totalContent: {
                        value: latestData.totalContent.toLocaleString(),
                        style: {
                            backgroundColor: '#FCAF4520',
                            borderColor: '#FCAF45',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };
        } catch (error) {
            console.error('Error generating Instagram chart:', error);
            return {
                title: 'Instagram Impressions & Reach',
                image: null
            };
        }
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
                        display: false,
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
        if (!report?.chart?.length) return { title: 'LinkedIn Impressions, Posts & Followers', image: null };

        const rawChartData = report.chart.map(item => ({
            date: new Date(item.date || item.createdAt),
            impressions: item.impressions || 0,
            postsCount: item.postsCount || 0,
            paidFollowers: item.paidFollowers || 0,
            followers: item.followers || 0
        }));

        const daysInMonth = new Date(year, month, 0).getDate();
        const completeData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const found = rawChartData
                .filter(d =>
                    d.date.getDate() === day &&
                    d.date.getMonth() + 1 === month &&
                    d.date.getFullYear() === year
                )
                .reduce((latest, current) =>
                    !latest || current.date > latest.date ? current : latest,
                    null
                );

            console.log(`--- Raw Data for ${month}/${year} ---`);
            rawChartData.forEach(d => {
                console.log(`Day: ${d.date.getDate()}, Followers: ${d.followers}, Posts: ${d.postsCount}`);
            });

            return found
                ? { ...found, day, isActualData: true }
                : {
                    date: new Date(year, month - 1, day),
                    impressions: 0,
                    postsCount: 0,
                    followers: 0,
                    paidFollowers: 0,
                    day,
                    isActualData: false
                };
        });

        const sampledData = [];
        for (let i = 0; i < daysInMonth; i += 4) sampledData.push(completeData[i]);
        if (!sampledData.some(d => d.day === daysInMonth)) sampledData.push(completeData[daysInMonth - 1]);

        const labels = sampledData.map(d => format(d.date, 'MMM d'));
        const impressionsData = sampledData.map(d => d.impressions);
        const postsData = sampledData.map(d => d.postsCount);
        const followersData = sampledData.map(d => d.followers);
        const paidFollowersData = sampledData.map(d => d.paidFollowers);

        console.log('followersData:', followersData);
        console.log('paidFollowersData:', paidFollowersData);
        console.log('postsData:', postsData);
        console.log('impressionsData:', impressionsData);

        // 👇 Add summary block values
        const totalImpressions = completeData.reduce((sum, d) => sum + d.impressions, 0);
        const totalPosts = completeData.reduce((sum, d) => sum + d.postsCount, 0);
        const totalFollowers = completeData.reduce((sum, d) => sum + d.followers, 0);
        const totalPaidFollowers = completeData.reduce((sum, d) => sum + d.paidFollowers, 0);


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
                    {
                        label: 'Posts',
                        data: postsData,
                        backgroundColor: '#F6C23E20',
                        borderColor: '#F6C23E',
                        borderWidth: 2,
                        type: 'line',
                        tension: 0.4,
                        yAxisID: 'y1',
                        pointBackgroundColor: '#F6C23E',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Followers',
                        data: followersData,
                        backgroundColor: '#1CC88A20',
                        borderColor: '#1CC88A',
                        borderWidth: 2,
                        type: 'line',
                        tension: 0.4,
                        yAxisID: 'y2',
                        pointBackgroundColor: '#1CC88A',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Paid Followers',
                        data: paidFollowersData,
                        backgroundColor: '#E74A3B20',
                        borderColor: '#E74A3B',
                        borderWidth: 2,
                        type: 'line',
                        tension: 0.4,
                        yAxisID: 'y2',
                        pointBackgroundColor: '#E74A3B',
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
                    },
                    legend: {
                        display: false,
                        labels: {
                            font: { weight: 'bold' },
                            color: '#343a40'
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Day of Month',
                            font: { weight: 'bold' },
                            color: '#343a40'
                        },
                        ticks: { color: '#343a40' },
                        grid: { color: '#f1f1f1' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Impressions',
                            font: { weight: 'bold' },
                            color: '#0077B5'
                        },
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v,
                            color: '#0077B5'
                        },
                        grid: { color: '#e0e0e0' }
                    },
                    y1: {
                        title: {
                            display: true,
                            text: 'Posts',
                            font: { weight: 'bold' },
                            color: '#F6C23E'
                        },
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v,
                            color: '#F6C23E'
                        }
                    },
                    y2: {
                        title: {
                            display: true,
                            text: 'Followers / Paid Followers',
                            font: { weight: 'bold' },
                            color: '#1CC88A'
                        },
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v,
                            color: '#1CC88A'
                        }
                    }
                }
            }
        };

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        return {
            title: 'LinkedIn Impressions, Posts & Followers',
            image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
            summary: {
                totalImpressions: {
                    value: totalImpressions.toLocaleString(),
                    style: {
                        backgroundColor: '#0077B530',
                        borderColor: '#0077B5',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                totalPosts: {
                    value: totalPosts.toLocaleString(),
                    style: {
                        backgroundColor: '#F6C23E20',
                        borderColor: '#F6C23E',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                totalFollowers: {
                    value: totalFollowers.toLocaleString(),
                    style: {
                        backgroundColor: '#1CC88A20',
                        borderColor: '#1CC88A',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                totalPaidFollowers: {
                    value: totalPaidFollowers.toLocaleString(),
                    style: {
                        backgroundColor: '#E74A3B20',
                        borderColor: '#E74A3B',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                }
            }
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
                report = await this.reportService.getXCommunityReport(customerId, month, year);

                if (!report?.chart?.length) {
                    console.log(`No chart data for X community report`);
                    return null;
                }
            }

            // Use latest data for summary
            const latestData = report.latestData || {
                followers: 0,
                following: 0,
                totalContent: 0
            };

            const monthData = report.chart.filter(item => {
                const date = new Date(item.date || item.createdAt);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });

            monthData.sort((a, b) =>
                new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
            );

            const daysInMonth = new Date(year, month, 0).getDate();
            const dayInterval = Math.max(1, Math.floor(daysInMonth / 10));
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

            const platformColor = '#1DA1F2'; // Twitter/X blue
            const metricName = 'Followers';

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'line' as const,
                            label: metricName,
                            data: sampledData.map(item => item.followers || 0),
                            backgroundColor: `${platformColor}30`,
                            borderColor: platformColor,
                            borderWidth: 3,
                            tension: 0.4,
                            fill: false,
                            pointBackgroundColor: platformColor,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        },
                        {
                            type: 'bar' as const,
                            label: 'Following',
                            data: sampledData.map(item => item.following || 0),
                            backgroundColor: '#6C757D',
                            borderRadius: 4,
                            barThickness: 14
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                            position: 'top',
                            labels: {
                                color: '#333',
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
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
                                font: { weight: 'bold' },
                                color: '#444'
                            },
                            ticks: { color: '#555' },
                            grid: { color: '#eee' }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#555',
                                callback: (value) => Number(value) >= 1000 ? `${Number(value) / 1000}k` : value
                            },
                            title: {
                                display: true,
                                text: 'Count',
                                color: '#444',
                                font: { weight: 'bold' }
                            },
                            grid: { color: '#f0f0f0' }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            // Get start and end dates from the data
            const startDate = sampledData.length > 0 ? format(sampledData[0].date || sampledData[0].createdAt, 'MMM d, yyyy') : '';
            const endDate = sampledData.length > 0 ? format(sampledData[sampledData.length - 1].date || sampledData[sampledData.length - 1].createdAt, 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? `(${startDate} - ${endDate})` : '';

            return {
                title: `Community Growth`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    totalFollowers: {
                        value: latestData.followers.toLocaleString(),
                        style: {
                            backgroundColor: `${platformColor}30`,
                            borderColor: platformColor,
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    totalFollowing: {
                        value: latestData.following.toLocaleString(),
                        style: {
                            backgroundColor: '#6C757D20',
                            borderColor: '#6C757D',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };

        } catch (error) {
            console.error(`Error generating X followers chart:`, error);
            return { title: `X Followers`, image: null };
        }
    }

    //Youtube
    private async generateSubscribersChart(
        customerId: string,
        month: number,
        year: number,
        platform: string = 'youtube',
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.community;
            if (!report) {
                report = await this.reportService.getYoutubeCommunityReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'YouTube Analytics', image: null };
            }

            // Use latest data for summary
            const latestData = report.latestData || {
                subscribers: 0,
                totalViews: 0,
                totalVideos: 0,
                totalLikes: 0,
                totalComments: 0
            };

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

            const sampledData = this.getDataWithDayGap(monthData, 4, month, year);

            const labels = sampledData.map(item => format(new Date(item.date || item.createdAt), 'MMM d'));

            // Rounded Bar Patch for NodeCanvas
            const ctx = (this.chartJSNodeCanvas as any)?._canvas?.getContext?.('2d');
            if (ctx && typeof ctx.roundRect !== 'function') {
                ctx.roundRect = function (x, y, w, h, r) {
                    this.beginPath();
                    this.moveTo(x + r, y);
                    this.arcTo(x + w, y, x + w, y + h, r);
                    this.arcTo(x + w, y + h, x, y + h, r);
                    this.arcTo(x, y + h, x, y, r);
                    this.arcTo(x, y, x + w, y, r);
                    this.closePath();
                };
            }

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Subscribers',
                            data: sampledData.map(item => Number(item.subscribers) || 0),
                            backgroundColor: '#FF000080',
                            borderColor: '#FF0000',
                            borderWidth: 2,
                            borderRadius: 6,
                            type: 'bar',
                            order: 2,
                            barThickness: 14,
                            borderSkipped: false
                        },
                        {
                            label: 'Total Views',
                            data: sampledData.map(item => Number(item.totalViews) || 0),
                            backgroundColor: '#2ecc7120',
                            borderColor: '#2ecc71',
                            borderWidth: 3,
                            type: 'line',
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            order: 1
                        },
                        {
                            label: 'Total Videos',
                            data: sampledData.map(item => Number(item.totalVideos) || 0),
                            backgroundColor: '#f39c1220',
                            borderColor: '#f39c12',
                            borderWidth: 3,
                            type: 'line',
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            order: 1
                        },
                        {
                            label: 'Total Likes',
                            data: sampledData.map(item => Number(item.totalLikes) || 0),
                            backgroundColor: '#9b59b620',
                            borderColor: '#9b59b6',
                            borderWidth: 3,
                            type: 'line',
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            order: 1
                        },
                        {
                            label: 'Total Comments',
                            data: sampledData.map(item => Number(item.totalComments) || 0),
                            backgroundColor: '#6c5ce720',
                            borderColor: '#6c5ce7',
                            borderWidth: 3,
                            type: 'line',
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    const date = new Date(sampledData[items[0].dataIndex].date || sampledData[items[0].dataIndex].createdAt);
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
                                }
                            }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#5f6368',
                                font: { size: 11 }
                            },
                            grid: { display: false },
                            title: {
                                display: true,
                                font: { size: 12, weight: 'bold' },
                                color: '#5f6368'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Counts',
                                font: { size: 12 },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368',
                                callback: value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value
                            },
                            grid: {
                                color: '#e0e0e0'
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            // Get start and end dates from the data
            const startDate = sampledData.length > 0 ? format(new Date(sampledData[0].date || sampledData[0].createdAt), 'MMM d, yyyy') : '';
            const endDate = sampledData.length > 0 ? format(new Date(sampledData[sampledData.length - 1].date || sampledData[sampledData.length - 1].createdAt), 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? `(${startDate} - ${endDate})` : '';

            const summary = {
                Subscribers: {
                    value: latestData.subscribers.toLocaleString(),
                    style: {
                        backgroundColor: '#FF000030',
                        borderColor: '#FF0000',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                Views: {
                    value: latestData.totalViews.toLocaleString(),
                    style: {
                        backgroundColor: '#2ecc7130',
                        borderColor: '#2ecc71',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                Videos: {
                    value: latestData.totalVideos.toLocaleString(),
                    style: {
                        backgroundColor: '#f39c1230',
                        borderColor: '#f39c12',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                Likes: {
                    value: latestData.totalLikes.toLocaleString(),
                    style: {
                        backgroundColor: '#9b59b630',
                        borderColor: '#9b59b6',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                },
                Comments: {
                    value: latestData.totalComments.toLocaleString(),
                    style: {
                        backgroundColor: '#6c5ce730',
                        borderColor: '#6c5ce7',
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                }
            };

            return {
                title: 'Community Analytics',
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary
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
                            data: sampledData.map(item => item.totalLikes || 0),
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
                            data: sampledData.map(item => item.totalComments || 0),
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
                            // display: true,
                            // text: `YouTube Analytics (${format(new Date(year, month - 1, 1), 'MMMM yyyy')})`,
                            // font: { size: 16 }
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
                            display: false,
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
    //Facebook
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
                return { title: 'Facebook Likes & Followers Growth', image: null };
            }

            const monthData = report.chart.filter(item => {
                const date = new Date(item.date || item.createdAt);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });

            if (!monthData.length) {
                return { title: 'Facebook Likes & Followers Growth', image: null };
            }

            monthData.sort((a, b) =>
                new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
            );

            const daysInMonth = new Date(year, month, 0).getDate();
            const interval = 4;
            const sampledData: any[] = [];

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

            const likesColor = '#1877F2';
            const followersColor = '#00BFA6';
            const contentColor = '#A020F0';

            const totalLikes = monthData.reduce((sum, d) => sum + (d.likes || 0), 0);
            const totalFollowers = monthData.reduce((sum, d) => sum + (d.followers || 0), 0);
            const totalContent = monthData.reduce((sum, d) => sum + (d.totalContent || 0), 0);

            const startDate = sampledData.length > 0 ? format(sampledData[0].date || sampledData[0].createdAt, 'MMM d, yyyy') : '';
            const endDate = sampledData.length > 0 ? format(sampledData[sampledData.length - 1].date || sampledData[sampledData.length - 1].createdAt, 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? `(${startDate} - ${endDate})` : '';


            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Likes',
                            data: sampledData.map(item => item.likes || 0),
                            backgroundColor: `${likesColor}80`,
                            borderColor: likesColor,
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: 'Followers',
                            data: sampledData.map(item => item.followers || 0),
                            borderColor: followersColor,
                            backgroundColor: `${followersColor}20`,
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: followersColor,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: 'Total Content',
                            data: sampledData.map(item => item.totalContent || 0),
                            borderColor: contentColor,
                            backgroundColor: `${contentColor}20`,
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: contentColor,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                            labels: {
                                font: { size: 12 },
                                color: '#202124',
                                boxWidth: 20,
                                boxHeight: 12,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    const date = new Date(sampledData[tooltipItems[0].dataIndex]?.date || sampledData[tooltipItems[0].dataIndex]?.createdAt);
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${Number(value).toLocaleString()}`;
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#5f6368',
                                font: { size: 11 }
                            },
                            title: {
                                display: true,
                                // text: 'Date',
                                font: { size: 12, weight: 'bold' },
                                color: '#5f6368'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Count',
                                font: { size: 12, weight: 'bold' },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368',
                                callback: value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value
                            },
                            grid: {
                                color: '#e0e0e0'
                            }
                        },
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            return {
                title: 'Community Growth',
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    Likes: {
                        value: totalLikes.toLocaleString(),
                        style: {
                            backgroundColor: '#1877F220',
                            borderColor: '#1877F2',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    Followers: {
                        value: totalFollowers.toLocaleString(),
                        style: {
                            backgroundColor: '#00BFA620',
                            borderColor: '#00BFA6',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    totalContent: {
                        value: totalContent.toLocaleString(),
                        style: {
                            backgroundColor: '#A020F020',
                            borderColor: '#A020F0',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };

        } catch (error) {
            console.error('Error generating Facebook likes chart:', error);
            return { title: 'Facebook Likes & Followers Growth', image: null };
        }
    }
    private async generateFacebookImpressionsChart(
        customerId: string,
        month: number,
        year: number,
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.overview;
            if (!report) {
                report = await this.reportService.getFacebookOverviewReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'Overview Performance', image: null };
            }

            const rawData = report.chart.map(d => ({
                date: new Date(d.date || d.createdAt),
                impressions: d.impressions || 0,
                pageViews: d.pageViews || 0,
                totalContent: d.totalContent || 0
            }));

            const monthData = this.formatChartData(rawData, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const totalImpressions = monthData.reduce((sum, d) => sum + (d.impressions || 0), 0);
            const totalPageViews = monthData.reduce((sum, d) => sum + (d.pageViews || 0), 0);
            const totalContent = monthData.reduce((sum, d) => sum + (d.totalContent || 0), 0);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const impressionsData = sampledData.map(d => d.impressions || 0);
            const pageViewsData = sampledData.map(d => d.pageViews || 0);
            const contentData = sampledData.map(d => d.totalContent || 0);

            const startDate = sampledData.length > 0 ? format(sampledData[0].date || sampledData[0].createdAt, 'MMM d, yyyy') : '';
            const endDate = sampledData.length > 0 ? format(sampledData[sampledData.length - 1].date || sampledData[sampledData.length - 1].createdAt, 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? `(${startDate} - ${endDate})` : '';

            // Monkey patch roundRect for Node.js Canvas
            const testCanvas = (this.chartJSNodeCanvas as any)._canvas;
            const ctx = testCanvas?.getContext?.('2d');
            if (ctx && typeof ctx.roundRect !== 'function') {
                ctx.roundRect = function (x, y, w, h, r) {
                    this.beginPath();
                    this.moveTo(x + r, y);
                    this.arcTo(x + w, y, x + w, y + h, r);
                    this.arcTo(x + w, y + h, x, y + h, r);
                    this.arcTo(x, y + h, x, y, r);
                    this.arcTo(x, y, x + w, y, r);
                    this.closePath();
                };
            }

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar' as const,
                            label: 'Impressions',
                            data: impressionsData,
                            backgroundColor: '#1877F280',
                            borderColor: '#1877F2',
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6
                        },
                        {
                            type: 'line' as const,
                            label: 'Page Views',
                            data: pageViewsData,
                            borderColor: '#00BFA6',
                            backgroundColor: '#00BFA620',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#00BFA6',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        },
                        {
                            type: 'line' as const,
                            label: 'Total Content',
                            data: contentData,
                            borderColor: '#A020F0',
                            backgroundColor: '#A020F020',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#A020F0',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                            labels: {
                                font: { size: 12 },
                                color: '#202124',
                                boxWidth: 20,
                                boxHeight: 12,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    const date = new Date(sampledData[items[0].dataIndex].date);
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: (ctx) => {
                                    const label = ctx.dataset.label || '';
                                    const value = ctx.parsed.y;
                                    return `${label}: ${Number(value).toLocaleString()}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#5f6368',
                                font: { size: 11 }
                            },
                            title: {
                                display: true,
                                // text: 'Date',
                                font: { size: 12, weight: 'bold' },
                                color: '#5f6368'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Count',
                                font: { size: 12, weight: 'bold' },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368',
                                //       stepSize: 5, // or adjust to 10, 50, 100 based on your data scale
                                font: { size: 11 },
                                callback: value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value
                            },
                            grid: {
                                //   display: true,
                                // drawTicks: false,
                                color: '#e0e0e0', // light grid lines
                                //    lineWidth: 1
                            }
                        }

                    }
                },
                plugins: [require('chartjs-plugin-annotation')]
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            return {
                title: 'Overview Performance',
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    impressions: {
                        value: totalImpressions.toLocaleString(),
                        style: {
                            backgroundColor: '#1877F280',
                            borderColor: '#1877F2',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    pageViews: {
                        value: totalPageViews.toLocaleString(),
                        style: {
                            backgroundColor: '#00BFA620',
                            borderColor: '#00BFA6',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    totalContent: {
                        value: totalContent.toLocaleString(),
                        style: {
                            backgroundColor: '#A020F020',
                            borderColor: '#A020F0',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };
        } catch (error) {
            console.error('Error generating Facebook impressions chart:', error);
            return { title: 'Facebook Impressions & Page Views', image: null };
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
                return { title: 'GBP Performance', image: null };
            }

            // Use latest data for summary
            const latestData = report.latestData || {
                impressionsMaps: 0,
                impressionsSearch: 0
            };

            const monthData = this.formatChartData(report.chart, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const mapsData = sampledData.map(d => d.maps || 0);
            const searchData = sampledData.map(d => d.search || 0);
            const totalData = sampledData.map((_, i) => (mapsData[i] + searchData[i]));

            // Get start and end dates from the data
            const startDate = monthData.length > 0 ? format(new Date(monthData[0].date), 'MMM d, yyyy') : '';
            const endDate = monthData.length > 0 ? format(new Date(monthData[monthData.length - 1].date), 'MMM d, yyyy') : '';
            const dateRange = startDate && endDate ? ` (${startDate} - ${endDate})` : '';

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'line',
                            label: 'Google Maps',
                            data: mapsData,
                            borderColor: '#1a73e8',
                            backgroundColor: '#1a73e820',
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: false
                        },
                        {
                            type: 'line',
                            label: 'Google Search',
                            data: searchData,
                            borderColor: '#34a853',
                            backgroundColor: '#34a85320',
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: false
                        },
                        {
                            type: 'bar',
                            label: 'Total',
                            data: totalData,
                            backgroundColor: '#fbbc04',
                            borderRadius: 6,
                            barThickness: 14
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false,
                            position: 'top',
                            labels: {
                                font: { size: 12 },
                                color: '#202124'
                            }
                        },
                        title: {
                            display: false
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#5f6368', font: { size: 11 } }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Impressions',
                                color: '#5f6368',
                                font: { size: 12 }
                            },
                            ticks: { color: '#5f6368' },
                            grid: { color: '#e0e0e0' }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            return {
                title: `Performance Growth`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    googleMaps: {
                        value: latestData.impressionsMaps.toLocaleString(),
                        style: {
                            backgroundColor: '#1a73e820',
                            borderColor: '#1a73e8',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    googleSearch: {
                        value: latestData.impressionsSearch.toLocaleString(),
                        style: {
                            backgroundColor: '#34a85320',
                            borderColor: '#34a853',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    total: {
                        value: (latestData.impressionsMaps + latestData.impressionsSearch).toLocaleString(),
                        style: {
                            backgroundColor: '#fbbc0420',
                            borderColor: '#fbbc04',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
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

            // Use latest data for summary
            const latestData = report.latestData || {
                websiteClicks: 0,
                phoneClicks: 0,
                directionRequests: 0
            };

            const monthData = this.formatChartData(report.chart, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const websiteData = sampledData.map(d => d.website || 0);
            const phoneData = sampledData.map(d => d.phone || 0);
            const directionsData = sampledData.map(d => d.directions || 0);

            // Patch for rounded bars in Node
            const testCanvas = (this.chartJSNodeCanvas as any)._canvas;
            const ctx = testCanvas?.getContext?.('2d');
            if (ctx && typeof ctx.roundRect !== 'function') {
                ctx.roundRect = function (x, y, w, h, r) {
                    this.beginPath();
                    this.moveTo(x + r, y);
                    this.arcTo(x + w, y, x + w, y + h, r);
                    this.arcTo(x + w, y + h, x, y + h, r);
                    this.arcTo(x, y + h, x, y, r);
                    this.arcTo(x, y, x + w, y, r);
                    this.closePath();
                };
            }

            const parseValidDate = (item: any): Date | null => {
                const rawDate = item?.date || item?.createdAt;
                const parsed = rawDate ? new Date(rawDate) : null;
                return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
            };

            const start = parseValidDate(monthData[0]);
            const end = parseValidDate(monthData[monthData.length - 1]);

            const startDate = start
                ? format(start, 'MMM d, yyyy')
                : format(new Date(year, month - 1, 1), 'MMM d, yyyy');

            const endDate = end
                ? format(end, 'MMM d, yyyy')
                : format(new Date(year, month, 0), 'MMM d, yyyy');

            const dateRange = `(${startDate} - ${endDate})`;

            const configuration: ChartConfiguration<'bar'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Website',
                            data: websiteData,
                            backgroundColor: '#4285F490',
                            borderColor: '#4285F4',
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6
                        },
                        {
                            label: 'Phone',
                            data: phoneData,
                            backgroundColor: '#EA433590',
                            borderColor: '#EA4335',
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6
                        },
                        {
                            label: 'Direction',
                            data: directionsData,
                            backgroundColor: '#FBBC0590',
                            borderColor: '#FBBC05',
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                            labels: {
                                font: { size: 12 },
                                color: '#202124',
                                boxWidth: 20,
                                boxHeight: 12,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    const date = new Date(sampledData[tooltipItems[0].dataIndex].date);
                                    return format(date, 'MMMM d, yyyy');
                                },
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${Number(value).toLocaleString()}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#5f6368',
                                font: { size: 11 }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count',
                                font: { size: 12 },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368',
                                stepSize: 500
                            },
                            grid: {
                                color: '#e0e0e0'
                            }
                        }
                    }
                },
                plugins: [require('chartjs-plugin-annotation')]
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            return {
                title: `Engagement Growth`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    website: {
                        value: latestData.websiteClicks.toLocaleString(),
                        style: {
                            backgroundColor: '#4285F420',
                            borderColor: '#4285F4',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    phone: {
                        value: latestData.phoneClicks.toLocaleString(),
                        style: {
                            backgroundColor: '#EA433520',
                            borderColor: '#EA4335',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    direction: {
                        value: latestData.directionRequests.toLocaleString(),
                        style: {
                            backgroundColor: '#FBBC0520',
                            borderColor: '#FBBC05',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };
        } catch (error) {
            console.error('Error generating GBP engagement chart:', error);
            return { title: 'GBP Engagement', image: null };
        }
    }

    private async generateGBPReviewsChart(
        customerId: string,
        month: number,
        year: number,
        preloadedData?: any
    ): Promise<ChartData> {
        try {
            let report = preloadedData?.reviews;
            if (!report) {
                report = await this.reportService.getGBPReviewsReport(customerId, month, year);
            }

            if (!report?.chart?.length) {
                return { title: 'GBP Reviews & Rating', image: null };
            }

            // Use latest data for summary
            const latestData = report.latestData || {
                avgRating: 0,
                totalReviews: 0
            };

            const monthData = this.formatChartData(report.chart, month, year);
            const sampledData = this.getDataWithDayGap(monthData, 1, month, year);

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const reviews = sampledData.map(d => d.reviews || 0);
            const ratings = sampledData.map(d => d.rating || 0);

            const parseValidDate = (item: any): Date | null => {
                const rawDate = item?.date || item?.createdAt;
                const parsed = rawDate ? new Date(rawDate) : null;
                return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
            };

            const start = parseValidDate(monthData[0]);
            const end = parseValidDate(monthData[monthData.length - 1]);

            const startDate = start
                ? format(start, 'MMM d, yyyy')
                : format(new Date(year, month - 1, 1), 'MMM d, yyyy');

            const endDate = end
                ? format(end, 'MMM d, yyyy')
                : format(new Date(year, month, 0), 'MMM d, yyyy');

            const dateRange = `(${startDate} - ${endDate})`;

            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Total Reviews',
                            data: reviews,
                            backgroundColor: '#6610f2A0',
                            borderColor: '#6610f2',
                            borderWidth: 1,
                            barThickness: 14,
                            borderRadius: 6
                        },
                        {
                            type: 'line',
                            label: 'Avg. Rating',
                            data: ratings,
                            borderColor: '#e83e8c',
                            backgroundColor: '#e83e8c30',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#e83e8c',
                            pointRadius: 3,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                            labels: {
                                font: { size: 12 },
                                color: '#202124'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#fff',
                            titleColor: '#000',
                            bodyColor: '#000',
                            borderColor: '#ddd',
                            borderWidth: 1,
                            callbacks: {
                                label: function (context) {
                                    if (context.dataset.label?.includes('Rating')) {
                                        return `Avg. Rating: ${(context.raw as number).toFixed(2)}`;
                                    }
                                    return `${context.dataset.label}: ${context.formattedValue}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#5f6368',
                                font: { size: 11 }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count',
                                font: { size: 12 },
                                color: '#5f6368'
                            },
                            ticks: {
                                color: '#5f6368'
                            },
                            grid: {
                                color: '#e0e0e0'
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            return {
                title: `Reviews & Rating`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    totalReviews: {
                        value: latestData.totalReviews.toLocaleString(),
                        style: {
                            backgroundColor: '#6610f220',
                            borderColor: '#6610f2',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    },
                    averageRating: {
                        value: latestData.avgRating.toFixed(2),
                        style: {
                            backgroundColor: '#e83e8c20',
                            borderColor: '#e83e8c',
                            borderWidth: 1,
                            borderRadius: 6,
                            textColor: '#000000'
                        }
                    }
                }
            };
        } catch (error) {
            console.error('Error generating GBP reviews chart:', error);
            return { title: 'GBP Reviews & Rating', image: null };
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

            // Process chart data
            const chartData = report.chart
                .map(d => ({ ...d, date: new Date(d.date) }))
                .filter(d => d.date.getMonth() + 1 === month && d.date.getFullYear() === year)
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            // Smart sampling for better chart readability
            const sampledData = this.sampleData(chartData, 15); // Max 15 data points

            const labels = sampledData.map(d => format(d.date, 'MMM d'));
            const pageViewsData = sampledData.map(d => d.pageViews);
            const visitsData = sampledData.map(d => d.visits);
            const visitorsData = sampledData.map(d => d.visitors);

            // Chart configuration
            const configuration: ChartConfiguration<'bar' | 'line'> = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Page Views',
                            data: pageViewsData,
                            backgroundColor: '#0d6efd90',
                            borderColor: '#0d6efd',
                            borderWidth: 1,
                            borderRadius: 6,
                            barThickness: 14
                        },
                        {
                            type: 'line',
                            label: 'Visits',
                            data: visitsData,
                            borderColor: '#fd7e14',
                            backgroundColor: '#fd7e1420',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#fd7e14',
                            pointRadius: 3
                        },
                        {
                            type: 'line',
                            label: 'Visitors',
                            data: visitorsData,
                            borderColor: '#20c997',
                            backgroundColor: '#20c99720',
                            borderWidth: 2,
                            tension: 0.4,
                            pointBackgroundColor: '#20c997',
                            pointRadius: 3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                title: (items) => format(sampledData[items[0].dataIndex].date, 'MMMM d, yyyy'),
                                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`
                            }
                        },
                        legend: { display: false }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (val) => Number(val) >= 1000 ? `${(Number(val) / 1000).toFixed(0)}k` : val
                            }
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            const dateRange = this.getDateRangeString(chartData);

            return {
                title: 'Website Traffic Performance',
                date: dateRange,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary: {
                    'Page Views': {
                        value: report.summary?.pageViews?.toLocaleString() || '0',
                        change: this.calculateMonthOverMonthChange(report.table?.Rows?.[0]?.slice(1, -1))
                    },
                    'Visits': {
                        value: report.summary?.visits?.toLocaleString() || '0',
                        change: this.calculateMonthOverMonthChange(report.table?.Rows?.[1]?.slice(1, -1))
                    },
                    'Visitors': {
                        value: report.summary?.visitors?.toLocaleString() || '0',
                        change: this.calculateMonthOverMonthChange(report.table?.Rows?.[2]?.slice(1, -1))
                    }
                }
            };
        } catch (error) {
            console.error('Website Traffic Chart Error:', error);
            return { title: 'Website Traffic', image: null };
        }
    }

    private sampleData(data: any[], maxPoints: number): any[] {
        if (data.length <= maxPoints) return data;
        const step = Math.ceil(data.length / maxPoints);
        return data.filter((_, i) => i % step === 0 || i === data.length - 1);
    }

    private getDateRangeString(data: any[]): string {
        if (!data.length) return '';
        const start = format(data[0].date, 'MMM d');
        const end = format(data[data.length - 1].date, 'MMM d, yyyy');
        return `${start} - ${end}`;
    }

    private calculateMonthOverMonthChange(values: number[]): string {
        if (!values || values.length < 2) return '0%';
        const prev = values[values.length - 2] || 0;
        const curr = values[values.length - 1] || 0;
        if (prev === 0) return curr === 0 ? '0%' : '∞%';
        const change = ((curr - prev) / prev) * 100;
        return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
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

            const labels = chartData.map(d => `${d.country} (${((d.visitors / totalVisitors) * 100).toFixed(1)}%)`);
            const data = chartData.map(d => d.visitors);

            const backgroundColors = [
                '#0d6efd', '#20c997', '#ffc107', '#fd7e14', '#6610f2',
                '#198754', '#6f42c1', '#dc3545', '#0dcaf0', '#adb5bd'
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
                    cutout: '60%',
                    plugins: {
                        legend: {
                            display: false,
                            position: 'right',
                            labels: {
                                color: '#343a40',
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const visitors = context.raw as number;
                                    const percent = ((visitors / totalVisitors) * 100).toFixed(1);
                                    return `${context.label}: ${visitors} visitors (${percent}%)`;
                                }
                            },
                            backgroundColor: '#fff',
                            titleColor: '#000',
                            bodyColor: '#000',
                            borderColor: '#dee2e6',
                            borderWidth: 1
                        }
                    }
                }
            };

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);

            // 👉 Add summary cards for top 3 countries (you can increase if needed)
            const summary = chartData.slice(0, 5).reduce((acc, item, idx) => {
                acc[item.country] = {
                    value: `${item.visitors} visitors`,
                    style: {
                        backgroundColor: `${backgroundColors[idx]}20`, // semi-transparent
                        borderColor: backgroundColors[idx],
                        borderWidth: 1,
                        borderRadius: 6,
                        textColor: '#000000'
                    }
                };
                return acc;
            }, {});

            const parseValidDate = (item: any): Date | null => {
                const rawDate = item?.date || item?.createdAt;
                const parsed = rawDate ? new Date(rawDate) : null;
                return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
            };

            const start = parseValidDate(report.chart[0]);
            const end = parseValidDate(report.chart[report.chart.length - 1]);

            const startDate = start
                ? format(start, 'MMM d, yyyy')
                : format(new Date(year, month - 1, 1), 'MMM d, yyyy');

            const endDate = end
                ? format(end, 'MMM d, yyyy')
                : format(new Date(year, month, 0), 'MMM d, yyyy'); // end of month

            const dateRange = `(${startDate} - ${endDate})`;

            console.log('Resolved dateRange:', dateRange);


            return {
                title: `Top 5 Visitor Locations`,
                date: `${dateRange}`,
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                summary
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

    private generateCombinedReportHtml(options: {
        platformReports: PlatformReport[];
        logoDataUri: string;
        footerBorderDataUri: string;
        month: string;
        customerName: string;
        brandLogo: string;
    }): string {
        const currentDate = format(new Date(), 'MMM d, yyyy');

        return `<!DOCTYPE html>
 <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                margin: 30px 0 0 0; /* Top only, no bottom */
            }
            body {
                margin: 0;
                padding: 0 40px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #2c3e50;
                line-height: 1.6;
                background-color: #fff;
            }
            .intro-page,
            .thank-you-page {
                -pdf-ignore-fixed-position: true; /* PDF-specific fix */
            }
            .intro-page .fixed-logo-container,
            .intro-page .main-content .fixed-logo-container {
                display: none !important;
                visibility: hidden !important;
            }
            .intro-page .fixed-logo-top-right,
            .intro-page .main-content .fixed-logo-top-right {
                display: none !important;
                visibility: hidden !important;
            }
            .logo-container img {
                height: 200px;
                width: auto;
                margin-bottom: 30px;
            }

            .logo {
                height: 300px;
                width: 300px;
            }

            .header {
                text-align: center;
                margin-bottom: 40px;
            }

            .header h1 {
                font-size: 40px;
                margin-bottom: 10px;
                font-weight: 700;
                text-transform: capitalize;
            }

            .header p {
                color: #7f8c8d;
                font-size: 16px;
                margin: 5px 0;
            }

            .customer-id {
                margin-top: 15px;
                background-color: #ecf0f1;
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 18px;
                font-weight: 600;
                color: #34495e;
                display: inline-block;
            }
            .intro-page {
                display: flex;
                flex-direction: column;
                justify-content: space-between; 
                align-items: center;
                min-height: 100vh;
                padding: 60px 40px;
                text-align: center;
                page-break-after: always;
                position: relative;
                box-sizing: border-box;
            }

            .platform-section {
            margin: 0;
            padding: 0;
            page-break-before: always; /* ✅ Forces new page */
            }

            .platform-title {
            margin: 20px 0 30px 0;
            display: flex;
            align-items: center;
            font-size: 24px;
            font-weight: 700;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            page-break-after: avoid;
            }

            .platform-icon {
                width: 28px;
                height: 28px;
                margin-right: 12px;
            }

            .section {
            margin: 0 0 30px 0;
            padding: 0;
            page-break-inside: avoid;
            break-inside: avoid;
            }

            .chart-container {
                margin: 0 0 30px 0;
                padding: 0;
                page-break-inside: avoid;
                break-inside: avoid;
            }

            .table-container {
                margin: 0 0 30px 0;
                padding: 0;
                page-break-inside: avoid;
                break-inside: avoid;
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
                margin: 0 0 20px;
                padding-top: 10px;
                page-break-inside: avoid;
            }

            .chart-title {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 5px;
                padding-left: 10px;
                border-left: 5px solid #2980b9;
                color: #2c3e50;
                text-align: left;
            }
            
            .chart-date {
                font-size: 20px;
                font-weight: 400;
                margin-bottom: 20px;
                padding-left: 10px;
                color: #2c3e50;
                text-align: left;
            }

            .chart-img {
                width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
                object-fit: contain;
            }

            .allpage{
                margin: 0; /* ✅ Let outer wrapper control spacing */
                padding: 0;

            }
            .footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                width: 100%;
                padding-top: 20px;
                padding-bottom: 50px;
                font-size: 14px;
                color: #555;
                position: relative;
                z-index: 10000;
            }

            .chart-summary-cards {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 30px;
                margin: 0 0 10px;
            }

            .summary-card {
                background-color: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 5px 7px;
                width: 100px;
                height: 50px;
                text-align: center;
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            }

            .summary-value {
                font-size: 18px;
                font-weight: 600;
                color: #2c3e50;
            }

            .summary-label {
                font-size: 12px;
                color:rgb(0, 0, 0);
                margin-top: 2px;
            }

            .footer-logo {
                    height: 35px;
                    width: 200px;
                }
            .footer-address {
                    text-align: right;
                    max-width: 60%;
                }

.global-footer {
  position: fixed;
  bottom: 20px; /* slightly above footer image */
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 22px;
  color: #999;
  z-index: 9998;
  margin: 0;
  padding: 0;
}

.contact-footer {
  display: none !important; /* Hidden by default */
  visibility: hidden !important;
  position: fixed;
  bottom: 85px; /* above footer image */
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 16px;
  color: #666;
  z-index: 9997;
  margin: 0;
  padding: 0;
  background: rgba(255, 255, 255, 0.9);
  line-height: 1.2;
}

/* Show only when body has show-contact-footer class */
body.show-contact-footer .contact-footer {
  display: block !important;
  visibility: visible !important;
}

        .footer-image {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 22px;
  object-fit: cover;
  margin: 0;
  padding: 0;
  border: none;
  z-index: 9999;
}
.fixed-logo-top-right {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    position: absolute !important; /* Force absolute on all pages */
}

.main-content .fixed-logo-top-right {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: fixed !important;
    top: -20px;
    right: 20px;
    height: 90px;
    width: 80px;
    z-index: 1000;
}
    .main-content .fixed-logo-container {
  display: block;
  position: fixed;
  top: 0;
  right: 20px;
  z-index: 1000;
}

    
.hospital-table {
    width: 100%;
    border-collapse: collapse;
    margin: 30px 0;
    font-size: 25px;
    min-width: 800px;
}

.hospital-table th {
    background-color: #f0f4f7;
    text-transform: uppercase;
    font-weight: 600;
    color: #34495e;
    padding: 18px 24px;
    text-align: center;
    height: 60px;
}

.hospital-table td {
    padding: 20px 24px;
    border-bottom: 1px solid #e0e0e0;
    text-align: center;
    height: 50px;
}

.hospital-table tr:nth-child(even) {
    background-color: #fafafa;
}

.hospital-table tr:hover {
    background-color: #f5f5f5;
}
.thank-you-page {
    page-break-before: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 80vh; /* ✅ Reduced from calc(100vh - 100px) */
    max-height: 100vh; /* ✅ Added max-height constraint */
    text-align: center;
    padding: 60px 40px;
    color: #2c3e50;
    page-break-after: avoid;
    overflow: hidden; /* ✅ Prevent content overflow */
    box-sizing: border-box; /* ✅ Include padding in height calculation */
}

.thank-you-page img {
    width: auto; /* ⬅️ Smaller logo */
    height: 60px;
    margin-bottom: 20px;
}

.thank-you-page h2 {
    font-size: 42px; /* ⬆️ Bigger font size */
    margin-bottom: 20px;
    color: #2980b9;
}

.colorContainer {
      margin: 0;
      font-family: 'Segoe UI', sans-serif;
      background-color: #ffffff;
    }
    .container {
      width: 700px;
      margin: 50px auto;
      display: flex;
      border-radius: 36px;
      overflow: hidden;
      background-color: #0176B6;
      color: white;
    }
    .left {
      flex: 1;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 30px;
      text-align: center;
    }
    .containerh1 {
      margin: 0;
      font-size: 36px;
      color: #5CD5FF;
    }
    .info {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px 40px;
      font-size: 28px;
    }
    .info label {
      display: block;
      color: #78D8FF;
      font-weight: 500;
      font-size: 26px;
      margin-bottom: 4px;
    }
    .info a {
      color: white;
      text-decoration: none;
    }
      /* Contact line - completely hidden by default */
.contact-line {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    top: -9999px !important;
    left: -9999px !important;
}

/* Only show contact line in main content pages */
.main-content .contact-line {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    height: auto !important;
    overflow: visible !important;
    position: fixed !important;
    top: auto !important;
    left: 0 !important;
    right: 0;
    bottom: 25px;
    text-align: center;
    font-size: 14px;
    color: #000;
    padding: 8px 20px;
    font-weight: 500;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: rgba(255, 255, 255, 0.95);
    z-index: 9998;
    margin: 0;
    box-sizing: border-box;
}

/* Ensure contact line is hidden on intro and thank you pages */
.intro-page .contact-line,
.thank-you-page .contact-line {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    top: -9999px !important;
    left: -9999px !important;
}

.contact-line img {
    height: 20px;
    width: auto;
}

.contact-line a {
    color: #000;
    text-decoration: none;
}

.contact-line a:hover {
    color: #000;
    text-decoration: none;
}


    </style>
</head>
<body>

<div class="intro-page">
    <div class="logo-container">
        <img src="${options.brandLogo}" alt="Client Logo" />
    </div>

    <div class="header">
        <h1>Digital Performance Report</h1>
        <p>For ${options.month} | Generated on ${currentDate}</p>
        <div class="customer-id">${options.customerName}</div>
    </div>

    <div class="footer">
            <img src="${options.logoDataUri}" alt="Upstrapp Logo" class="footer-logo" />
            <div class="footer-address">
                <strong>Makarba, Ahmedabad</strong><br />
                hello@upstrapp.com<br /> 
                www.upstrapp.com
            </div>
    </div>
</div>

<div class="main-content">

    ${options.platformReports.map(platform => {
            const combinedSections: string[] = [];
            const tables = platform.tables || [];
            const charts = platform.charts || [];
            const max = Math.max(tables.length, charts.length);

            // In the generateCombinedReportHtml method, replace the hospital table section with:
            if (platform.name.toLowerCase() === 'hospital') {
                // Add platform header for hospital
                combinedSections.push(`
                    <div class="section-with-header">
                        <div class="platform-title">
                            <img src="${this.getPlatformIconDataUri(platform.name)}" class="platform-icon" alt="${platform.name}" />
                            ${platform.name}
                        </div>
                    </div>
                `);

                tables.forEach(table => {
                    combinedSections.push(`
                <div class="section">
                    <div class="section-title">${table.title}</div>
                    <table class="hospital-table">
                        <thead>
                            <tr>
                                ${table.headers.map(h => `<th>${h}</th>`).join('')}
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
            `);
                });
            }
            else {
                // Existing handling for other platforms
                for (let i = 0; i < max; i++) {
                    const table = tables[i];
                    const chart = charts[i];

                    // First, add chart if it exists
                    if (chart && chart.image) {
                        const summaryHtml = chart.summary
                            ? `
    <div class="chart-summary-cards">
    ${Object.entries(chart.summary).map(([key, metric]) => {
                                const label = key
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, str => str.toUpperCase());
                                const typedMetric = metric as MetricSummary;
                                const style = typedMetric.style || {};

                                return `
        <div class="summary-card" style="
            background-color: ${style.backgroundColor || '#f8f9fa'};
            border: ${style.borderWidth || 1}px solid ${style.borderColor || '#e0e0e0'};
            border-radius: ${style.borderRadius || 10}px;
            color: ${style.textColor || '#ffffff'};
        ">
            <div class="summary-value">${typedMetric.value}</div>
            <div class="summary-label">${label}</div>
        </div>`;
                            }).join('')}
    </div>`
                            : '';
                        combinedSections.push(`
                    <div class="section-with-header">
                        <div class="platform-title">
                            <img src="${this.getPlatformIconDataUri(platform.name)}" class="platform-icon" alt="${platform.name}" />
                            ${platform.name}
                        </div>
                        <div class="chart-container">
                            <div class="chart-title">${chart.title}</div>
                            <div class="chart-date">${chart.date}</div>
                            ${summaryHtml}
                            <img src="${chart.image}" class="chart-img" />
                        </div>
                    </div>
                `);
                    }

                    // Then, add table if it exists
                    if (table && table.rows?.length > 0) {
                        // Remove all platform headers from individual tables - only keep page-level platform headings
                        const needsPlatformHeader = false;
                        const platformHeader = needsPlatformHeader ? `
                            <div class="platform-title" style="margin-bottom: 15px; font-size: 18px;">
                                <img src="${this.getPlatformIconDataUri(platform.name)}" class="platform-icon" alt="${platform.name}" />
                                ${platform.name}
                            </div>` : '';

                        combinedSections.push(`
                    <div class="allpage">
                        <div class="section">
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
                          <div class="contact-line">
                                <img src="${options.logoDataUri}" alt="Logo" />
                                <div class="contact-links">
                                    <a href="mailto:hello@upstrapp.com">hello@upstrapp.com</a>  |  <a href="https://www.upstrapp.com">www.upstrapp.com</a>
                                </div>
                            </div>
                    </div>
                `);
                    }
                }
            }

            // Show platform header for all platforms
            return `
        <div class="platform-section">
            ${combinedSections.join('')}
        </div>
    `;
        }).join('')}
</div>

<!-- ✅ Thank You Page (LAST PAGE ONLY) -->
<div class="thank-you-page">
        <img src="${options.logoDataUri}" alt="Client Logo" />
<div class="colorContainer">
  <div class="container">
    <div class="left">
      <h1 class="containerh1">Thank you</h1>
      <div class="info">
        <div>
          <label>TELEPHONE</label>
          <div>+91 72111 20206</div>
        </div>
        <div>
          <label>WEBSITE</label>
          <div><a href="https://www.upstrapp.com">www.upstrapp.com</a></div>
        </div>
        <div>
          <label>EMAIL</label>
          <div><a href="mailto:hello@upstrapp.com">hello@upstrapp.com</a></div>
        </div>
        <div>
          <label>ADDRESS</label>
          <div>Makarba, Ahmedabad,<br>Gujarat, INDIA.</div>
        </div>
      </div>
    </div>
  </div>
  </div></div>
<img src="${options.footerBorderDataUri}" class="footer-image" />
</body>
</html>`;
    }

    private getPlatformIconDataUri(platformName: string): string {
        const icons: Record<string, string> = {
            'instagram': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E1306C">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>`,
            'youtube': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF0000">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>`,
            'facebook': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z"/>
        </svg>`,
            'linkedin': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>`,
            'x (twitter)': `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>`
            ,
            'website': `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#2ECC71" viewBox="0 0 16 16">
  <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
</svg>`,
            'google business profile': `
<svg version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 512 512">
                <path d="M0 0 C0.73505757 -0.00465992 1.47011514 -0.00931984 2.22744718 -0.01412097 C4.68603035 -0.02605448 7.14405922 -0.01668211 9.60264683 -0.00736332 C11.38490385 -0.01153696 13.16715821 -0.01701464 14.94940764 -0.02368313 C19.84368011 -0.03815245 24.73778439 -0.03388835 29.63206613 -0.02651632 C34.91164351 -0.02179066 40.19118419 -0.03428914 45.47074986 -0.04453373 C55.81243014 -0.06173867 66.15404971 -0.06255825 76.49574059 -0.05732083 C84.90035569 -0.05328118 93.30495283 -0.05472024 101.70956707 -0.06006908 C103.50311383 -0.06119172 103.50311383 -0.06119172 105.33289387 -0.06233703 C107.76186128 -0.06386849 110.1908287 -0.06540684 112.6197961 -0.066952 C135.40316751 -0.08068308 158.1865046 -0.07523499 180.96987522 -0.06376678 C201.81860764 -0.05383297 222.66725132 -0.06677659 243.51597004 -0.09070098 C264.91867439 -0.11507623 286.32133739 -0.12470377 307.72405535 -0.11804825 C319.74199158 -0.11455264 331.75985955 -0.11681073 343.7777853 -0.13429928 C354.00797601 -0.14900153 364.23805039 -0.14968252 374.46823876 -0.13222837 C379.68846326 -0.12369988 384.90847978 -0.12161397 390.12869358 -0.13687992 C394.90737821 -0.15068177 399.68567579 -0.14602191 404.46433777 -0.12664068 C406.19306044 -0.12286653 407.92181378 -0.12584325 409.65050923 -0.13625234 C426.93847953 -0.23294726 426.93847953 -0.23294726 434.62133884 6.23969173 C435.15114353 6.86359798 435.68094822 7.48750423 436.22680759 8.13031673 C436.76950291 8.74391048 437.31219822 9.35750423 437.87133884 9.98969173 C442.68702907 17.45096368 443.51611782 26.02984448 444.77441502 34.63300228 C444.99089064 36.06817876 445.20809941 37.50324481 445.42598057 38.93820858 C446.01284768 42.82000832 446.58834906 46.70341027 447.16092944 50.58734012 C447.64235792 53.84701587 448.12891624 57.10591827 448.61529809 60.36485797 C449.7652708 68.0719888 450.90551914 75.78051664 452.04004002 83.48993587 C453.20297272 91.3910474 454.3835555 99.28937793 455.57285136 107.18656033 C456.59880746 114.00405654 457.61272885 120.82327403 458.61759359 127.64391071 C459.2153944 131.70045222 459.81755107 135.7562125 460.43169308 139.81031513 C468.72735697 194.68191991 468.72735697 194.68191991 452.60180759 218.00141048 C447.43262899 224.84848778 447.43262899 224.84848778 444.0214901 226.62999058 C440.2382335 228.84143764 437.09828646 230.99513682 435.8370235 235.39342928 C434.888603 241.81217411 435.15571605 248.31580265 435.26660252 254.78412533 C435.26774694 256.98580279 435.26441758 259.18748645 435.25695896 261.38915157 C435.25042371 266.12324211 435.27529686 270.85575216 435.32463741 275.58958721 C435.4023437 283.07867808 435.40911617 290.56681881 435.40632725 298.05625057 C435.40976205 308.55935729 435.44444815 319.06198573 435.50732517 329.56488705 C435.5132891 330.56349886 435.5132891 330.56349886 435.51937351 331.58228464 C435.52335674 332.24883505 435.52733996 332.91538545 435.53144389 333.60213435 C435.58779585 343.04639568 435.63450462 352.49063817 435.66943455 361.93500423 C435.67313543 362.93148151 435.67313543 362.93148151 435.67691108 363.94808964 C435.71728952 375.04283225 435.737297 386.1375692 435.74707967 397.23237956 C435.7557858 404.67292447 435.79236978 412.11265756 435.85158765 419.55296588 C435.8840323 424.18706352 435.89615424 428.82106336 435.90331364 433.45526218 C435.91101912 435.59904535 435.92736157 437.74281814 435.95312786 439.8864603 C436.20387849 461.40284977 436.20387849 461.40284977 430.41430759 468.38031673 C424.25325083 474.11659635 418.79935561 476.62724303 410.29894066 476.64037895 C409.5904272 476.64418462 408.88191374 476.64799029 408.15193018 476.65191129 C405.77168947 476.66223878 403.39168673 476.6583188 401.01142979 476.6544714 C399.29007251 476.65892318 397.56871729 476.66423703 395.84736508 476.67034012 C391.11209436 476.68453783 386.37688921 476.68618308 381.64160025 476.68574321 C376.53645919 476.68738987 371.43134526 476.70045357 366.32621861 476.711936 C355.16091046 476.73479717 343.99562131 476.74270784 332.83029294 476.74776244 C325.85926832 476.75101823 318.88824924 476.75754 311.91722775 476.76476383 C292.6183121 476.78433138 273.31940159 476.80073463 254.02047539 476.80364037 C252.78520511 476.80382794 251.54993483 476.80401551 250.27723212 476.80420876 C247.77300783 476.80457501 245.26878354 476.80493871 242.76455925 476.80529987 C240.8998944 476.80557409 240.8998944 476.80557409 238.99755955 476.80585384 C237.13062 476.80612467 237.13062 476.80612467 235.22596451 476.80640096 C215.05742757 476.80994279 194.88899738 476.83696504 174.72049747 476.87435173 C154.01619795 476.91242466 133.31195143 476.93179777 112.60761613 476.93209988 C100.98191659 476.93268468 89.35634439 476.94119164 77.7306776 476.97009754 C67.83132873 476.99459783 57.93215364 477.00190341 48.03278265 476.98685002 C42.98239232 476.97967559 37.93234525 476.98056173 32.88199329 477.00326061 C28.25602449 477.0238528 23.6306628 477.02124793 19.00470056 477.00038577 C17.33374994 476.99689134 15.66275549 477.00179893 13.99186233 477.01609021 C5.03075233 477.08777812 -3.10757378 477.04713059 -10.58569241 471.38031673 C-17.02350399 464.53213743 -18.89132925 458.51914713 -18.79687405 449.29100704 C-18.79561079 448.37358016 -18.79434753 447.45615328 -18.793046 446.51092559 C-18.78663343 443.43562752 -18.76609371 440.36058176 -18.74584866 437.28534603 C-18.7387763 435.08087105 -18.73272325 432.8763926 -18.7276144 430.67191219 C-18.71538816 425.92361312 -18.69781502 421.17537353 -18.67669582 416.4271059 C-18.64523854 408.91799307 -18.63735887 401.40897401 -18.63500881 393.89980221 C-18.6344952 392.63252228 -18.63398159 391.36524235 -18.63345242 390.05956 C-18.63241095 387.46817622 -18.63140669 384.87679242 -18.6304388 382.28540862 C-18.62743068 375.62766996 -18.6221956 368.96993622 -18.614501 362.3122015 C-18.61373751 361.64423917 -18.61297401 360.97627683 -18.61218739 360.28807322 C-18.59887458 349.46546133 -18.55610019 338.64313154 -18.50424087 327.82064476 C-18.4518312 316.70105359 -18.43832112 305.58179423 -18.45711517 294.46208793 C-18.46620322 288.22172942 -18.45695481 281.9825817 -18.40432644 275.74241352 C-18.35504148 269.87238339 -18.35217645 264.0041649 -18.38480091 258.13403606 C-18.38847299 255.98136146 -18.37505421 253.8285787 -18.34317875 251.67613697 C-17.75605845 240.46498212 -17.75605845 240.46498212 -21.74468899 230.44575596 C-24.26572202 228.43284265 -26.78654769 226.96528502 -29.58569241 225.38031673 C-42.08872728 212.65751979 -47.89728872 196.47828564 -47.95270824 178.92275429 C-47.74963501 165.00665168 -45.34620246 151.22845944 -43.27497864 137.49292493 C-42.66136267 133.40582951 -42.06332354 129.31644817 -41.46282864 125.22740841 C-40.45456872 118.37856528 -39.43407525 111.53163226 -38.40600491 104.68573666 C-37.22152875 96.79729468 -36.05688637 88.90611372 -34.90259004 81.01320344 C-33.78422906 73.36925669 -32.65186784 65.72744612 -31.51320553 58.08649921 C-31.03188651 54.85496605 -30.55539902 51.62277685 -30.08292294 48.38993931 C-29.52622584 44.58522413 -28.95720637 40.78254462 -28.37895489 36.98104763 C-28.16996409 35.5942291 -27.96506446 34.20678626 -27.76477337 32.81868458 C-26.2260294 22.18262131 -24.53434989 12.61301309 -16.65991116 4.85297298 C-11.26484145 1.0225751 -6.55298065 0.00516645 0 0 Z " fill="#7885CA" transform="translate(47.585692405700684,17.619683265686035)"/>
                <path d="M0 0 C0.33 0 0.66 0 1 0 C1.08636719 0.57105469 1.17273438 1.14210937 1.26171875 1.73046875 C3.35625498 13.81728791 7.69366038 25.96055863 16.7109375 34.6484375 C18 36 18 36 18 38 C18.86818359 38.39445312 18.86818359 38.39445312 19.75390625 38.796875 C22.11313426 40.06060061 23.90297172 41.51616016 25.9375 43.25 C40.9317529 55.12148288 57.64693714 56.23257642 76 55 C90.13039549 53.08816852 104.10709964 44.06107997 113.1875 33.3125 C120.17438203 24.11704095 123.96782676 14.05851417 127 3 C127.66 3 128.32 3 129 3 C129.52787109 4.75763672 129.52787109 4.75763672 130.06640625 6.55078125 C133.21733058 16.70424024 136.4131384 26.53158777 144.2109375 34.1640625 C146 36 146 36 146 38 C146.86818359 38.39445312 146.86818359 38.39445312 147.75390625 38.796875 C150.11313426 40.06060061 151.90297172 41.51616016 153.9375 43.25 C167.0549002 53.57188868 183.53221798 57.73924962 200 56 C208.23854368 54.67113827 215.86184426 52.00312849 223.14453125 47.953125 C225 47 225 47 227 47 C227.11415881 75.49340077 227.20259771 103.98677268 227.25532665 132.48035752 C227.26157989 135.84725695 227.26805153 139.21415593 227.2746582 142.58105469 C227.27596976 143.25131991 227.27728131 143.92158513 227.2786326 144.61216141 C227.30036608 155.45307454 227.33977615 166.29385457 227.38576398 177.13468884 C227.4325861 188.26534537 227.45993348 199.39594776 227.47044247 210.52670014 C227.47695611 216.77580509 227.49224601 223.02460854 227.52865028 229.27361679 C227.56265596 235.15872266 227.57304348 241.04340361 227.56553841 246.9285984 C227.56691088 249.0852483 227.5768157 251.2419128 227.59602737 253.39847755 C227.77933035 275.04130319 227.77933035 275.04130319 222 282 C215.838409 287.7360172 210.38546232 290.24692565 201.88463306 290.26006222 C201.17611961 290.26386789 200.46760615 290.26767356 199.73762259 290.27159455 C197.35738188 290.28192204 194.97737913 290.27800206 192.59712219 290.27415466 C190.87576492 290.27860645 189.1544097 290.28392029 187.43305749 290.29002339 C182.69778676 290.3042211 177.96258162 290.30586634 173.22729266 290.30542648 C168.12215159 290.30707313 163.01703767 290.32013684 157.91191101 290.33161926 C146.74660287 290.35448043 135.58131372 290.36239111 124.41598535 290.36744571 C117.44496073 290.37070149 110.47394164 290.37722326 103.50292015 290.3844471 C84.2040045 290.40401465 64.905094 290.42041789 45.60616779 290.42332363 C44.37089752 290.4235112 43.13562724 290.42369877 41.86292453 290.42389202 C39.35870024 290.42425828 36.85447594 290.42462198 34.35025165 290.42498314 C32.4855868 290.42525735 32.4855868 290.42525735 30.58325195 290.42553711 C28.71631241 290.42580793 28.71631241 290.42580793 26.81165691 290.42608423 C6.64311997 290.42962605 -13.52531021 290.4566483 -33.69381013 290.494035 C-54.39810964 290.53210792 -75.10235617 290.55148104 -95.80669147 290.55178314 C-107.43239101 290.55236795 -119.05796321 290.5608749 -130.68362999 290.58978081 C-140.58297886 290.61428109 -150.48215395 290.62158668 -160.38152494 290.60653328 C-165.43191527 290.59935885 -170.48196234 290.60024499 -175.5323143 290.62294388 C-180.1582831 290.64353606 -184.78364479 290.64093119 -189.40960703 290.62006903 C-191.08055765 290.61657461 -192.7515521 290.62148219 -194.42244526 290.63577347 C-203.38355526 290.70746138 -211.52188137 290.66681386 -219 285 C-225.45078526 278.13802004 -227.30306523 272.10119436 -227.24050903 262.8568573 C-227.24221788 261.93378589 -227.24392673 261.01071449 -227.24568737 260.05967122 C-227.24898238 256.96572731 -227.23797827 253.87200012 -227.22705078 250.77807617 C-227.22648667 248.56061813 -227.22680322 246.34315972 -227.22793579 244.1257019 C-227.22851031 238.10343013 -227.21673991 232.08123781 -227.20278788 226.05898452 C-227.19029706 219.76624055 -227.18911132 213.47349481 -227.18673706 207.18074036 C-227.18122438 196.61795704 -227.1687265 186.0551998 -227.15087891 175.49243164 C-227.13251628 164.61352687 -227.11836165 153.73463003 -227.10986328 142.85571289 C-227.10933783 142.1849525 -227.10881239 141.51419212 -227.10827102 140.82310566 C-227.10566091 137.45804285 -227.1031335 134.09297998 -227.10064721 130.72791708 C-227.07973431 102.81859106 -227.04454896 74.90929758 -227 47 C-221.80422808 48.70527204 -216.828776 50.72481233 -211.8046875 52.87890625 C-199.73130911 57.70489455 -181.76427018 56.86654424 -169.7109375 52.26171875 C-152.46607157 44.23565002 -140.41660748 33.88323993 -133 16 C-131.52030092 11.70335825 -130.20155079 7.38212642 -129 3 C-128.34 3 -127.68 3 -127 3 C-126.64808594 4.17175781 -126.29617187 5.34351563 -125.93359375 6.55078125 C-122.78266942 16.70424024 -119.5868616 26.53158777 -111.7890625 34.1640625 C-110 36 -110 36 -110 38 C-109.42121094 38.26296875 -108.84242188 38.5259375 -108.24609375 38.796875 C-105.88686574 40.06060061 -104.09702828 41.51616016 -102.0625 43.25 C-87.0682471 55.12148288 -70.35306286 56.23257642 -52 55 C-36.68822612 52.92832895 -22.06146227 42.81412784 -12.8515625 30.7421875 C-7.90967287 23.42318641 -4.43921535 15.46456186 -2 7 C-1.69255859 5.95585937 -1.69255859 5.95585937 -1.37890625 4.890625 C-0.90715095 3.26388259 -0.45153445 1.63247069 0 0 Z " fill="#1E88E4" transform="translate(256,204)"/>
                <path d="M0 0 C37.62 0 75.24 0 114 0 C115.16442361 10.47981246 116.32073032 20.90802678 117.14057922 31.41279602 C117.20148554 32.18892054 117.26239185 32.96504505 117.32514381 33.76468849 C117.38800261 34.56679441 117.4508614 35.36890034 117.515625 36.1953125 C117.65325207 37.92552804 117.79109108 39.65572674 117.92912292 41.38591003 C118.29704 46.00842351 118.66115337 50.63122876 119.0242424 55.25412369 C119.25126688 58.14111047 119.47935786 61.02801108 119.70779419 63.91488647 C122.01219512 93.04278501 124.25002942 122.17559679 126.4375 151.3125 C126.50338821 152.18889381 126.56927643 153.06528763 126.63716125 153.96823883 C127.01401721 158.98130518 127.38953703 163.99446788 127.76275063 169.00780678 C127.87545836 170.52051589 127.98849717 172.03320037 128.10188866 173.54585838 C128.25579675 175.60121145 128.40827091 177.65666562 128.56030273 179.7121582 C128.68851662 181.43581352 128.68851662 181.43581352 128.81932068 183.19429016 C128.94374673 185.12646151 129 187.06382646 129 189 C128.34 189 127.68 189 127 189 C126.9071875 190.3303125 126.9071875 190.3303125 126.8125 191.6875 C125.28604831 202.01718679 120.33909991 210.89426569 114 219 C113.278125 220.010625 112.55625 221.02125 111.8125 222.0625 C105.057349 229.85860869 95.61741996 235.52351838 86 239 C85.2982666 239.25821533 84.5965332 239.51643066 83.87353516 239.7824707 C77.07701452 242.07862936 70.76691207 242.50582809 63.625 242.4375 C61.96573486 242.42614014 61.96573486 242.42614014 60.27294922 242.41455078 C52.56203264 242.2584409 45.96117135 241.52436663 39 238 C37.61554688 237.34644531 37.61554688 237.34644531 36.203125 236.6796875 C18.62186374 227.79192283 7.66365341 213.81509308 1.54296875 195.23046875 C0.16089569 189.55303192 -0.14434957 183.91486204 -0.12025452 178.09693909 C-0.12153615 176.94865652 -0.12153615 176.94865652 -0.12284368 175.77717632 C-0.1244824 173.22846109 -0.1190036 170.67981262 -0.11352539 168.13110352 C-0.11324315 166.29758201 -0.11340198 164.46406038 -0.1139679 162.63053894 C-0.11425441 157.66415976 -0.10838118 152.69780481 -0.10139394 147.73143125 C-0.0951362 142.53709617 -0.09455468 137.34276051 -0.09336853 132.14842224 C-0.09026236 122.31717749 -0.08205858 112.48594388 -0.07201904 102.65470403 C-0.05874402 89.36622978 -0.05335223 76.07775248 -0.04751682 62.78927326 C-0.03811822 41.85950717 -0.01819452 20.92976458 0 0 Z " fill="#7885CA" transform="translate(256,18)"/>
                <path d="M0 0 C37.62 0 75.24 0 114 0 C114.1209091 46.41118296 114.1209091 46.41118296 114.14648438 65.88671875 C114.16427265 79.32441652 114.18516399 92.76205779 114.22631836 106.19970703 C114.25627892 115.98706362 114.27558881 125.77437427 114.28226548 135.56177545 C114.28616647 140.74110874 114.29529464 145.92031067 114.31719017 151.09960175 C114.33766055 155.98166238 114.34381258 160.86353842 114.33932304 165.74563789 C114.34014354 167.53054624 114.34604599 169.31546122 114.35761642 171.10033226 C114.46958263 189.2748006 111.19043292 204.29330719 100 219 C99.278125 220.010625 98.55625 221.02125 97.8125 222.0625 C91.057349 229.85860869 81.61741996 235.52351838 72 239 C71.2982666 239.25821533 70.5965332 239.51643066 69.87353516 239.7824707 C63.07719695 242.07856772 56.76678465 242.50635346 49.625 242.4375 C47.96573486 242.42614014 47.96573486 242.42614014 46.27294922 242.41455078 C38.56203264 242.2584409 31.96117135 241.52436663 25 238 C23.61554688 237.34644531 23.61554688 237.34644531 22.203125 236.6796875 C5.3059713 228.13775621 -5.52817293 214.95280921 -11.8125 197.1875 C-15.8977296 183.70624231 -13.83324764 169.12446949 -12.69036865 155.30761719 C-12.42843043 152.1403333 -12.17271908 148.97259649 -11.91845703 145.8046875 C-11.57380365 141.51329943 -11.22778852 137.22202625 -10.88026047 132.93087006 C-9.58593509 116.93476273 -8.33475448 100.93520795 -7.07759762 84.93614578 C-6.61538478 79.05429214 -6.15211786 73.172523 -5.68778515 67.29083633 C-5.3919933 63.54334682 -5.09662852 59.79582376 -4.8014431 56.04828644 C-4.65848209 54.23343427 -4.51542806 52.41858942 -4.37227821 50.60375214 C-3.68718314 41.91180343 -3.00769785 33.219735 -2.37988281 24.5234375 C-2.28889313 23.26619873 -2.19790344 22.00895996 -2.10415649 20.71362305 C-1.94235046 18.45486786 -1.78307782 16.19592889 -1.62704468 13.93676758 C-1.55756622 12.96118896 -1.48808777 11.98561035 -1.41650391 10.98046875 C-1.33089706 9.74139771 -1.33089706 9.74139771 -1.24356079 8.47729492 C-0.96411346 5.63499235 -0.46952462 2.81714774 0 0 Z " fill="#3E51B5" transform="translate(142,18)"/>
                <path d="M0 0 C42.24 0 84.48 0 128 0 C128 16.29347855 123.83894851 29.06945528 114 42 C112.9171875 43.5159375 112.9171875 43.5159375 111.8125 45.0625 C105.057349 52.85860869 95.61741996 58.52351838 86 62 C84.9473999 62.387323 84.9473999 62.387323 83.87353516 62.7824707 C77.07701452 65.07862936 70.76691207 65.50582809 63.625 65.4375 C62.51882324 65.42992676 61.41264648 65.42235352 60.27294922 65.41455078 C52.56203264 65.2584409 45.96117135 64.52436663 39 61 C38.07703125 60.56429687 37.1540625 60.12859375 36.203125 59.6796875 C19.3059713 51.13775621 8.47182707 37.95280921 2.1875 20.1875 C0.09050114 13.3167449 0 7.27068258 0 0 Z " fill="#3849AB" transform="translate(128,195)"/>
                <path d="M0 0 C42.24 0 84.48 0 128 0 C128 16.29347855 123.83894851 29.06945528 114 42 C112.9171875 43.5159375 112.9171875 43.5159375 111.8125 45.0625 C105.057349 52.85860869 95.61741996 58.52351838 86 62 C84.9473999 62.387323 84.9473999 62.387323 83.87353516 62.7824707 C77.07701452 65.07862936 70.76691207 65.50582809 63.625 65.4375 C62.51882324 65.42992676 61.41264648 65.42235352 60.27294922 65.41455078 C52.56203264 65.2584409 45.96117135 64.52436663 39 61 C38.07703125 60.56429687 37.1540625 60.12859375 36.203125 59.6796875 C19.3059713 51.13775621 8.47182707 37.95280921 2.1875 20.1875 C0.09050114 13.3167449 0 7.27068258 0 0 Z " fill="#3849AB" transform="translate(256,195)"/>
                <path d="M0 0 C0.01797954 2.2490755 0.03083236 4.4981924 0.04150391 6.74731445 C0.04920807 7.9997847 0.05691223 9.25225494 0.06484985 10.54267883 C-0.22710323 26.10748754 -9.42610262 40.48778533 -20.171875 51.15625 C-33.56378936 62.84047058 -52.42240923 68.37407373 -69.96972656 67.20703125 C-87.14178286 65.45596057 -103.17134835 56.3391442 -114.25 43.25 C-122.62272771 32.23859447 -128.08299347 19.19216844 -128.01953125 5.28125 C-128.01530151 4.0756543 -128.01530151 4.0756543 -128.01098633 2.84570312 C-128.00736084 2.23662109 -128.00373535 1.62753906 -128 1 C-115.88818376 0.86763798 -103.77634885 0.73714191 -91.66448879 0.60884857 C-86.0368141 0.54918334 -80.40914697 0.48894144 -74.78149414 0.42724609 C-49.85369321 0.15438002 -24.929549 -0.09671194 0 0 Z " fill="#3849AB" transform="translate(512,194)"/>
                <path d="M0 0 C10.23 0 20.46 0 31 0 C31 19.77297984 26.51985152 34.41023218 13 49 C0.97556559 60.93792768 -16.8218388 67.20683462 -33.5625 67.25 C-37.23856253 67.23586789 -40.47157801 67.17614066 -44 66 C-43 63 -43 63 -41.46875 61.96020508 C-40.8190625 61.64978271 -40.169375 61.33936035 -39.5 61.01953125 C-38.78199219 60.6647168 -38.06398438 60.30990234 -37.32421875 59.94433594 C-36.55722656 59.57083008 -35.79023438 59.19732422 -35 58.8125 C-18.91842646 50.57836098 -8.76252897 38.21464349 -3 21 C-0.8877663 14.04479952 -0.61146338 7.33756051 0 0 Z " fill="#303F9F" transform="translate(481,194)"/>
                </svg>`,
            'gbp': `
<svg version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 512 512">
                <path d="M0 0 C0.73505757 -0.00465992 1.47011514 -0.00931984 2.22744718 -0.01412097 C4.68603035 -0.02605448 7.14405922 -0.01668211 9.60264683 -0.00736332 C11.38490385 -0.01153696 13.16715821 -0.01701464 14.94940764 -0.02368313 C19.84368011 -0.03815245 24.73778439 -0.03388835 29.63206613 -0.02651632 C34.91164351 -0.02179066 40.19118419 -0.03428914 45.47074986 -0.04453373 C55.81243014 -0.06173867 66.15404971 -0.06255825 76.49574059 -0.05732083 C84.90035569 -0.05328118 93.30495283 -0.05472024 101.70956707 -0.06006908 C103.50311383 -0.06119172 103.50311383 -0.06119172 105.33289387 -0.06233703 C107.76186128 -0.06386849 110.1908287 -0.06540684 112.6197961 -0.066952 C135.40316751 -0.08068308 158.1865046 -0.07523499 180.96987522 -0.06376678 C201.81860764 -0.05383297 222.66725132 -0.06677659 243.51597004 -0.09070098 C264.91867439 -0.11507623 286.32133739 -0.12470377 307.72405535 -0.11804825 C319.74199158 -0.11455264 331.75985955 -0.11681073 343.7777853 -0.13429928 C354.00797601 -0.14900153 364.23805039 -0.14968252 374.46823876 -0.13222837 C379.68846326 -0.12369988 384.90847978 -0.12161397 390.12869358 -0.13687992 C394.90737821 -0.15068177 399.68567579 -0.14602191 404.46433777 -0.12664068 C406.19306044 -0.12286653 407.92181378 -0.12584325 409.65050923 -0.13625234 C426.93847953 -0.23294726 426.93847953 -0.23294726 434.62133884 6.23969173 C435.15114353 6.86359798 435.68094822 7.48750423 436.22680759 8.13031673 C436.76950291 8.74391048 437.31219822 9.35750423 437.87133884 9.98969173 C442.68702907 17.45096368 443.51611782 26.02984448 444.77441502 34.63300228 C444.99089064 36.06817876 445.20809941 37.50324481 445.42598057 38.93820858 C446.01284768 42.82000832 446.58834906 46.70341027 447.16092944 50.58734012 C447.64235792 53.84701587 448.12891624 57.10591827 448.61529809 60.36485797 C449.7652708 68.0719888 450.90551914 75.78051664 452.04004002 83.48993587 C453.20297272 91.3910474 454.3835555 99.28937793 455.57285136 107.18656033 C456.59880746 114.00405654 457.61272885 120.82327403 458.61759359 127.64391071 C459.2153944 131.70045222 459.81755107 135.7562125 460.43169308 139.81031513 C468.72735697 194.68191991 468.72735697 194.68191991 452.60180759 218.00141048 C447.43262899 224.84848778 447.43262899 224.84848778 444.0214901 226.62999058 C440.2382335 228.84143764 437.09828646 230.99513682 435.8370235 235.39342928 C434.888603 241.81217411 435.15571605 248.31580265 435.26660252 254.78412533 C435.26774694 256.98580279 435.26441758 259.18748645 435.25695896 261.38915157 C435.25042371 266.12324211 435.27529686 270.85575216 435.32463741 275.58958721 C435.4023437 283.07867808 435.40911617 290.56681881 435.40632725 298.05625057 C435.40976205 308.55935729 435.44444815 319.06198573 435.50732517 329.56488705 C435.5132891 330.56349886 435.5132891 330.56349886 435.51937351 331.58228464 C435.52335674 332.24883505 435.52733996 332.91538545 435.53144389 333.60213435 C435.58779585 343.04639568 435.63450462 352.49063817 435.66943455 361.93500423 C435.67313543 362.93148151 435.67313543 362.93148151 435.67691108 363.94808964 C435.71728952 375.04283225 435.737297 386.1375692 435.74707967 397.23237956 C435.7557858 404.67292447 435.79236978 412.11265756 435.85158765 419.55296588 C435.8840323 424.18706352 435.89615424 428.82106336 435.90331364 433.45526218 C435.91101912 435.59904535 435.92736157 437.74281814 435.95312786 439.8864603 C436.20387849 461.40284977 436.20387849 461.40284977 430.41430759 468.38031673 C424.25325083 474.11659635 418.79935561 476.62724303 410.29894066 476.64037895 C409.5904272 476.64418462 408.88191374 476.64799029 408.15193018 476.65191129 C405.77168947 476.66223878 403.39168673 476.6583188 401.01142979 476.6544714 C399.29007251 476.65892318 397.56871729 476.66423703 395.84736508 476.67034012 C391.11209436 476.68453783 386.37688921 476.68618308 381.64160025 476.68574321 C376.53645919 476.68738987 371.43134526 476.70045357 366.32621861 476.711936 C355.16091046 476.73479717 343.99562131 476.74270784 332.83029294 476.74776244 C325.85926832 476.75101823 318.88824924 476.75754 311.91722775 476.76476383 C292.6183121 476.78433138 273.31940159 476.80073463 254.02047539 476.80364037 C252.78520511 476.80382794 251.54993483 476.80401551 250.27723212 476.80420876 C247.77300783 476.80457501 245.26878354 476.80493871 242.76455925 476.80529987 C240.8998944 476.80557409 240.8998944 476.80557409 238.99755955 476.80585384 C237.13062 476.80612467 237.13062 476.80612467 235.22596451 476.80640096 C215.05742757 476.80994279 194.88899738 476.83696504 174.72049747 476.87435173 C154.01619795 476.91242466 133.31195143 476.93179777 112.60761613 476.93209988 C100.98191659 476.93268468 89.35634439 476.94119164 77.7306776 476.97009754 C67.83132873 476.99459783 57.93215364 477.00190341 48.03278265 476.98685002 C42.98239232 476.97967559 37.93234525 476.98056173 32.88199329 477.00326061 C28.25602449 477.0238528 23.6306628 477.02124793 19.00470056 477.00038577 C17.33374994 476.99689134 15.66275549 477.00179893 13.99186233 477.01609021 C5.03075233 477.08777812 -3.10757378 477.04713059 -10.58569241 471.38031673 C-17.02350399 464.53213743 -18.89132925 458.51914713 -18.79687405 449.29100704 C-18.79561079 448.37358016 -18.79434753 447.45615328 -18.793046 446.51092559 C-18.78663343 443.43562752 -18.76609371 440.36058176 -18.74584866 437.28534603 C-18.7387763 435.08087105 -18.73272325 432.8763926 -18.7276144 430.67191219 C-18.71538816 425.92361312 -18.69781502 421.17537353 -18.67669582 416.4271059 C-18.64523854 408.91799307 -18.63735887 401.40897401 -18.63500881 393.89980221 C-18.6344952 392.63252228 -18.63398159 391.36524235 -18.63345242 390.05956 C-18.63241095 387.46817622 -18.63140669 384.87679242 -18.6304388 382.28540862 C-18.62743068 375.62766996 -18.6221956 368.96993622 -18.614501 362.3122015 C-18.61373751 361.64423917 -18.61297401 360.97627683 -18.61218739 360.28807322 C-18.59887458 349.46546133 -18.55610019 338.64313154 -18.50424087 327.82064476 C-18.4518312 316.70105359 -18.43832112 305.58179423 -18.45711517 294.46208793 C-18.46620322 288.22172942 -18.45695481 281.9825817 -18.40432644 275.74241352 C-18.35504148 269.87238339 -18.35217645 264.0041649 -18.38480091 258.13403606 C-18.38847299 255.98136146 -18.37505421 253.8285787 -18.34317875 251.67613697 C-17.75605845 240.46498212 -17.75605845 240.46498212 -21.74468899 230.44575596 C-24.26572202 228.43284265 -26.78654769 226.96528502 -29.58569241 225.38031673 C-42.08872728 212.65751979 -47.89728872 196.47828564 -47.95270824 178.92275429 C-47.74963501 165.00665168 -45.34620246 151.22845944 -43.27497864 137.49292493 C-42.66136267 133.40582951 -42.06332354 129.31644817 -41.46282864 125.22740841 C-40.45456872 118.37856528 -39.43407525 111.53163226 -38.40600491 104.68573666 C-37.22152875 96.79729468 -36.05688637 88.90611372 -34.90259004 81.01320344 C-33.78422906 73.36925669 -32.65186784 65.72744612 -31.51320553 58.08649921 C-31.03188651 54.85496605 -30.55539902 51.62277685 -30.08292294 48.38993931 C-29.52622584 44.58522413 -28.95720637 40.78254462 -28.37895489 36.98104763 C-28.16996409 35.5942291 -27.96506446 34.20678626 -27.76477337 32.81868458 C-26.2260294 22.18262131 -24.53434989 12.61301309 -16.65991116 4.85297298 C-11.26484145 1.0225751 -6.55298065 0.00516645 0 0 Z " fill="#7885CA" transform="translate(47.585692405700684,17.619683265686035)"/>
                <path d="M0 0 C0.33 0 0.66 0 1 0 C1.08636719 0.57105469 1.17273438 1.14210937 1.26171875 1.73046875 C3.35625498 13.81728791 7.69366038 25.96055863 16.7109375 34.6484375 C18 36 18 36 18 38 C18.86818359 38.39445312 18.86818359 38.39445312 19.75390625 38.796875 C22.11313426 40.06060061 23.90297172 41.51616016 25.9375 43.25 C40.9317529 55.12148288 57.64693714 56.23257642 76 55 C90.13039549 53.08816852 104.10709964 44.06107997 113.1875 33.3125 C120.17438203 24.11704095 123.96782676 14.05851417 127 3 C127.66 3 128.32 3 129 3 C129.52787109 4.75763672 129.52787109 4.75763672 130.06640625 6.55078125 C133.21733058 16.70424024 136.4131384 26.53158777 144.2109375 34.1640625 C146 36 146 36 146 38 C146.86818359 38.39445312 146.86818359 38.39445312 147.75390625 38.796875 C150.11313426 40.06060061 151.90297172 41.51616016 153.9375 43.25 C167.0549002 53.57188868 183.53221798 57.73924962 200 56 C208.23854368 54.67113827 215.86184426 52.00312849 223.14453125 47.953125 C225 47 225 47 227 47 C227.11415881 75.49340077 227.20259771 103.98677268 227.25532665 132.48035752 C227.26157989 135.84725695 227.26805153 139.21415593 227.2746582 142.58105469 C227.27596976 143.25131991 227.27728131 143.92158513 227.2786326 144.61216141 C227.30036608 155.45307454 227.33977615 166.29385457 227.38576398 177.13468884 C227.4325861 188.26534537 227.45993348 199.39594776 227.47044247 210.52670014 C227.47695611 216.77580509 227.49224601 223.02460854 227.52865028 229.27361679 C227.56265596 235.15872266 227.57304348 241.04340361 227.56553841 246.9285984 C227.56691088 249.0852483 227.5768157 251.2419128 227.59602737 253.39847755 C227.77933035 275.04130319 227.77933035 275.04130319 222 282 C215.838409 287.7360172 210.38546232 290.24692565 201.88463306 290.26006222 C201.17611961 290.26386789 200.46760615 290.26767356 199.73762259 290.27159455 C197.35738188 290.28192204 194.97737913 290.27800206 192.59712219 290.27415466 C190.87576492 290.27860645 189.1544097 290.28392029 187.43305749 290.29002339 C182.69778676 290.3042211 177.96258162 290.30586634 173.22729266 290.30542648 C168.12215159 290.30707313 163.01703767 290.32013684 157.91191101 290.33161926 C146.74660287 290.35448043 135.58131372 290.36239111 124.41598535 290.36744571 C117.44496073 290.37070149 110.47394164 290.37722326 103.50292015 290.3844471 C84.2040045 290.40401465 64.905094 290.42041789 45.60616779 290.42332363 C44.37089752 290.4235112 43.13562724 290.42369877 41.86292453 290.42389202 C39.35870024 290.42425828 36.85447594 290.42462198 34.35025165 290.42498314 C32.4855868 290.42525735 32.4855868 290.42525735 30.58325195 290.42553711 C28.71631241 290.42580793 28.71631241 290.42580793 26.81165691 290.42608423 C6.64311997 290.42962605 -13.52531021 290.4566483 -33.69381013 290.494035 C-54.39810964 290.53210792 -75.10235617 290.55148104 -95.80669147 290.55178314 C-107.43239101 290.55236795 -119.05796321 290.5608749 -130.68362999 290.58978081 C-140.58297886 290.61428109 -150.48215395 290.62158668 -160.38152494 290.60653328 C-165.43191527 290.59935885 -170.48196234 290.60024499 -175.5323143 290.62294388 C-180.1582831 290.64353606 -184.78364479 290.64093119 -189.40960703 290.62006903 C-191.08055765 290.61657461 -192.7515521 290.62148219 -194.42244526 290.63577347 C-203.38355526 290.70746138 -211.52188137 290.66681386 -219 285 C-225.45078526 278.13802004 -227.30306523 272.10119436 -227.24050903 262.8568573 C-227.24221788 261.93378589 -227.24392673 261.01071449 -227.24568737 260.05967122 C-227.24898238 256.96572731 -227.23797827 253.87200012 -227.22705078 250.77807617 C-227.22648667 248.56061813 -227.22680322 246.34315972 -227.22793579 244.1257019 C-227.22851031 238.10343013 -227.21673991 232.08123781 -227.20278788 226.05898452 C-227.19029706 219.76624055 -227.18911132 213.47349481 -227.18673706 207.18074036 C-227.18122438 196.61795704 -227.1687265 186.0551998 -227.15087891 175.49243164 C-227.13251628 164.61352687 -227.11836165 153.73463003 -227.10986328 142.85571289 C-227.10933783 142.1849525 -227.10881239 141.51419212 -227.10827102 140.82310566 C-227.10566091 137.45804285 -227.1031335 134.09297998 -227.10064721 130.72791708 C-227.07973431 102.81859106 -227.04454896 74.90929758 -227 47 C-221.80422808 48.70527204 -216.828776 50.72481233 -211.8046875 52.87890625 C-199.73130911 57.70489455 -181.76427018 56.86654424 -169.7109375 52.26171875 C-152.46607157 44.23565002 -140.41660748 33.88323993 -133 16 C-131.52030092 11.70335825 -130.20155079 7.38212642 -129 3 C-128.34 3 -127.68 3 -127 3 C-126.64808594 4.17175781 -126.29617187 5.34351563 -125.93359375 6.55078125 C-122.78266942 16.70424024 -119.5868616 26.53158777 -111.7890625 34.1640625 C-110 36 -110 36 -110 38 C-109.42121094 38.26296875 -108.84242188 38.5259375 -108.24609375 38.796875 C-105.88686574 40.06060061 -104.09702828 41.51616016 -102.0625 43.25 C-87.0682471 55.12148288 -70.35306286 56.23257642 -52 55 C-36.68822612 52.92832895 -22.06146227 42.81412784 -12.8515625 30.7421875 C-7.90967287 23.42318641 -4.43921535 15.46456186 -2 7 C-1.69255859 5.95585937 -1.69255859 5.95585937 -1.37890625 4.890625 C-0.90715095 3.26388259 -0.45153445 1.63247069 0 0 Z " fill="#1E88E4" transform="translate(256,204)"/>
                <path d="M0 0 C37.62 0 75.24 0 114 0 C115.16442361 10.47981246 116.32073032 20.90802678 117.14057922 31.41279602 C117.20148554 32.18892054 117.26239185 32.96504505 117.32514381 33.76468849 C117.38800261 34.56679441 117.4508614 35.36890034 117.515625 36.1953125 C117.65325207 37.92552804 117.79109108 39.65572674 117.92912292 41.38591003 C118.29704 46.00842351 118.66115337 50.63122876 119.0242424 55.25412369 C119.25126688 58.14111047 119.47935786 61.02801108 119.70779419 63.91488647 C122.01219512 93.04278501 124.25002942 122.17559679 126.4375 151.3125 C126.50338821 152.18889381 126.56927643 153.06528763 126.63716125 153.96823883 C127.01401721 158.98130518 127.38953703 163.99446788 127.76275063 169.00780678 C127.87545836 170.52051589 127.98849717 172.03320037 128.10188866 173.54585838 C128.25579675 175.60121145 128.40827091 177.65666562 128.56030273 179.7121582 C128.68851662 181.43581352 128.68851662 181.43581352 128.81932068 183.19429016 C128.94374673 185.12646151 129 187.06382646 129 189 C128.34 189 127.68 189 127 189 C126.9071875 190.3303125 126.9071875 190.3303125 126.8125 191.6875 C125.28604831 202.01718679 120.33909991 210.89426569 114 219 C113.278125 220.010625 112.55625 221.02125 111.8125 222.0625 C105.057349 229.85860869 95.61741996 235.52351838 86 239 C85.2982666 239.25821533 84.5965332 239.51643066 83.87353516 239.7824707 C77.07701452 242.07862936 70.76691207 242.50582809 63.625 242.4375 C61.96573486 242.42614014 61.96573486 242.42614014 60.27294922 242.41455078 C52.56203264 242.2584409 45.96117135 241.52436663 39 238 C37.61554688 237.34644531 37.61554688 237.34644531 36.203125 236.6796875 C18.62186374 227.79192283 7.66365341 213.81509308 1.54296875 195.23046875 C0.16089569 189.55303192 -0.14434957 183.91486204 -0.12025452 178.09693909 C-0.12153615 176.94865652 -0.12153615 176.94865652 -0.12284368 175.77717632 C-0.1244824 173.22846109 -0.1190036 170.67981262 -0.11352539 168.13110352 C-0.11324315 166.29758201 -0.11340198 164.46406038 -0.1139679 162.63053894 C-0.11425441 157.66415976 -0.10838118 152.69780481 -0.10139394 147.73143125 C-0.0951362 142.53709617 -0.09455468 137.34276051 -0.09336853 132.14842224 C-0.09026236 122.31717749 -0.08205858 112.48594388 -0.07201904 102.65470403 C-0.05874402 89.36622978 -0.05335223 76.07775248 -0.04751682 62.78927326 C-0.03811822 41.85950717 -0.01819452 20.92976458 0 0 Z " fill="#7885CA" transform="translate(256,18)"/>
                <path d="M0 0 C37.62 0 75.24 0 114 0 C114.1209091 46.41118296 114.1209091 46.41118296 114.14648438 65.88671875 C114.16427265 79.32441652 114.18516399 92.76205779 114.22631836 106.19970703 C114.25627892 115.98706362 114.27558881 125.77437427 114.28226548 135.56177545 C114.28616647 140.74110874 114.29529464 145.92031067 114.31719017 151.09960175 C114.33766055 155.98166238 114.34381258 160.86353842 114.33932304 165.74563789 C114.34014354 167.53054624 114.34604599 169.31546122 114.35761642 171.10033226 C114.46958263 189.2748006 111.19043292 204.29330719 100 219 C99.278125 220.010625 98.55625 221.02125 97.8125 222.0625 C91.057349 229.85860869 81.61741996 235.52351838 72 239 C71.2982666 239.25821533 70.5965332 239.51643066 69.87353516 239.7824707 C63.07719695 242.07856772 56.76678465 242.50635346 49.625 242.4375 C47.96573486 242.42614014 47.96573486 242.42614014 46.27294922 242.41455078 C38.56203264 242.2584409 31.96117135 241.52436663 25 238 C23.61554688 237.34644531 23.61554688 237.34644531 22.203125 236.6796875 C5.3059713 228.13775621 -5.52817293 214.95280921 -11.8125 197.1875 C-15.8977296 183.70624231 -13.83324764 169.12446949 -12.69036865 155.30761719 C-12.42843043 152.1403333 -12.17271908 148.97259649 -11.91845703 145.8046875 C-11.57380365 141.51329943 -11.22778852 137.22202625 -10.88026047 132.93087006 C-9.58593509 116.93476273 -8.33475448 100.93520795 -7.07759762 84.93614578 C-6.61538478 79.05429214 -6.15211786 73.172523 -5.68778515 67.29083633 C-5.3919933 63.54334682 -5.09662852 59.79582376 -4.8014431 56.04828644 C-4.65848209 54.23343427 -4.51542806 52.41858942 -4.37227821 50.60375214 C-3.68718314 41.91180343 -3.00769785 33.219735 -2.37988281 24.5234375 C-2.28889313 23.26619873 -2.19790344 22.00895996 -2.10415649 20.71362305 C-1.94235046 18.45486786 -1.78307782 16.19592889 -1.62704468 13.93676758 C-1.55756622 12.96118896 -1.48808777 11.98561035 -1.41650391 10.98046875 C-1.33089706 9.74139771 -1.33089706 9.74139771 -1.24356079 8.47729492 C-0.96411346 5.63499235 -0.46952462 2.81714774 0 0 Z " fill="#3E51B5" transform="translate(142,18)"/>
                <path d="M0 0 C42.24 0 84.48 0 128 0 C128 16.29347855 123.83894851 29.06945528 114 42 C112.9171875 43.5159375 112.9171875 43.5159375 111.8125 45.0625 C105.057349 52.85860869 95.61741996 58.52351838 86 62 C84.9473999 62.387323 84.9473999 62.387323 83.87353516 62.7824707 C77.07701452 65.07862936 70.76691207 65.50582809 63.625 65.4375 C62.51882324 65.42992676 61.41264648 65.42235352 60.27294922 65.41455078 C52.56203264 65.2584409 45.96117135 64.52436663 39 61 C38.07703125 60.56429687 37.1540625 60.12859375 36.203125 59.6796875 C19.3059713 51.13775621 8.47182707 37.95280921 2.1875 20.1875 C0.09050114 13.3167449 0 7.27068258 0 0 Z " fill="#3849AB" transform="translate(128,195)"/>
                <path d="M0 0 C42.24 0 84.48 0 128 0 C128 16.29347855 123.83894851 29.06945528 114 42 C112.9171875 43.5159375 112.9171875 43.5159375 111.8125 45.0625 C105.057349 52.85860869 95.61741996 58.52351838 86 62 C84.9473999 62.387323 84.9473999 62.387323 83.87353516 62.7824707 C77.07701452 65.07862936 70.76691207 65.50582809 63.625 65.4375 C62.51882324 65.42992676 61.41264648 65.42235352 60.27294922 65.41455078 C52.56203264 65.2584409 45.96117135 64.52436663 39 61 C38.07703125 60.56429687 37.1540625 60.12859375 36.203125 59.6796875 C19.3059713 51.13775621 8.47182707 37.95280921 2.1875 20.1875 C0.09050114 13.3167449 0 7.27068258 0 0 Z " fill="#3849AB" transform="translate(256,195)"/>
                <path d="M0 0 C0.01797954 2.2490755 0.03083236 4.4981924 0.04150391 6.74731445 C0.04920807 7.9997847 0.05691223 9.25225494 0.06484985 10.54267883 C-0.22710323 26.10748754 -9.42610262 40.48778533 -20.171875 51.15625 C-33.56378936 62.84047058 -52.42240923 68.37407373 -69.96972656 67.20703125 C-87.14178286 65.45596057 -103.17134835 56.3391442 -114.25 43.25 C-122.62272771 32.23859447 -128.08299347 19.19216844 -128.01953125 5.28125 C-128.01530151 4.0756543 -128.01530151 4.0756543 -128.01098633 2.84570312 C-128.00736084 2.23662109 -128.00373535 1.62753906 -128 1 C-115.88818376 0.86763798 -103.77634885 0.73714191 -91.66448879 0.60884857 C-86.0368141 0.54918334 -80.40914697 0.48894144 -74.78149414 0.42724609 C-49.85369321 0.15438002 -24.929549 -0.09671194 0 0 Z " fill="#3849AB" transform="translate(512,194)"/>
                <path d="M0 0 C10.23 0 20.46 0 31 0 C31 19.77297984 26.51985152 34.41023218 13 49 C0.97556559 60.93792768 -16.8218388 67.20683462 -33.5625 67.25 C-37.23856253 67.23586789 -40.47157801 67.17614066 -44 66 C-43 63 -43 63 -41.46875 61.96020508 C-40.8190625 61.64978271 -40.169375 61.33936035 -39.5 61.01953125 C-38.78199219 60.6647168 -38.06398438 60.30990234 -37.32421875 59.94433594 C-36.55722656 59.57083008 -35.79023438 59.19732422 -35 58.8125 C-18.91842646 50.57836098 -8.76252897 38.21464349 -3 21 C-0.8877663 14.04479952 -0.61146338 7.33756051 0 0 Z " fill="#303F9F" transform="translate(481,194)"/>
                </svg>`,
            'hospital': `
        <svg version="1.1"
     xmlns="http://www.w3.org/2000/svg"
     width="16"
     height="16"
     viewBox="0 0 512 512">
  <path d="M0 0 C1.56291445 -0.00435243 3.12582678 -0.00953735 4.68873596 -0.01548767 C8.91602866 -0.02883102 13.14323169 -0.02946161 17.37054133 -0.02692437 C20.90672378 -0.0258516 24.44288831 -0.03074577 27.97906691 -0.03552979 C36.32460002 -0.04660859 44.6700881 -0.04707139 53.015625 -0.04101562 C61.61008003 -0.03497493 70.20437139 -0.04729299 78.7987985 -0.06858569 C86.19268042 -0.08622692 93.58651036 -0.09219913 100.98041254 -0.08894795 C105.38989471 -0.08713916 109.79926006 -0.08973095 114.20872307 -0.10366249 C118.35632347 -0.11627754 122.50366941 -0.11426216 126.6512661 -0.1012516 C128.16813495 -0.09889435 129.68502191 -0.10158981 131.20186996 -0.10987473 C140.3926873 -0.15643175 148.4642696 0.07025306 156.42211914 5.0871582 C162.31068823 11.1489205 161.9685135 17.40759566 161.90788269 25.38534546 C161.91044596 26.61553772 161.91300924 27.84572997 161.91565019 29.11320078 C161.91973337 32.52031052 161.91037295 35.92690187 161.895316 39.33394885 C161.88234937 43.01076914 161.88674554 46.68757368 161.88902283 50.3644104 C161.89059517 56.73225057 161.8811901 63.09999845 161.86430931 69.4678154 C161.83991852 78.67457163 161.83211396 87.88128328 161.82834534 97.08806832 C161.82178098 112.02577852 161.80182023 126.96343954 161.7734375 141.90112305 C161.74589653 156.41088617 161.72466313 170.92063593 161.71191406 185.43041992 C161.71112589 186.32494225 161.71033772 187.21946459 161.70952567 188.14109366 C161.70561053 192.62869114 161.70181941 197.11628872 161.69808996 201.60388637 C161.66699453 238.82751203 161.61393599 276.05108049 161.54711914 313.2746582 C165.17711914 313.2746582 168.80711914 313.2746582 172.54711914 313.2746582 C172.87711914 236.0546582 173.20711914 158.8346582 173.54711914 79.2746582 C281.96378581 79.2746582 281.96378581 79.2746582 288.23461914 84.5246582 C293.22664622 90.46112283 293.98828754 95.81576949 293.91461182 103.29644775 C293.91951508 104.62531513 293.91951508 104.62531513 293.92451739 105.98102832 C293.93177671 108.9374798 293.91766157 111.89343259 293.90356445 114.84985352 C293.90435561 116.97407109 293.90645373 119.09828852 293.90975952 121.22250366 C293.91488835 126.98250671 293.90136963 132.74233075 293.88423252 138.50230503 C293.86918963 144.52804183 293.87037043 150.55377638 293.86956787 156.57952881 C293.86587705 166.69408218 293.85091673 176.80856761 293.82836914 186.9230957 C293.79946414 199.9161527 293.78914269 212.90915509 293.78468704 225.90224075 C293.78071088 237.06483092 293.76821087 248.22740917 293.75434017 259.38999081 C293.75023815 262.98302877 293.74731413 266.57606631 293.74454498 270.16910553 C293.73965898 275.80631259 293.7294674 281.44348639 293.71510696 287.08067703 C293.71057721 289.15316848 293.70774371 291.22566441 293.70669937 293.29816055 C293.70495857 296.11907507 293.69708872 298.93990584 293.68756104 301.76080322 C293.68886076 303.00120043 293.68886076 303.00120043 293.69018674 304.26665616 C293.6735728 307.52820123 293.58593208 310.15821939 292.54711914 313.2746582 C301.78711914 313.2746582 311.02711914 313.2746582 320.54711914 313.2746582 C320.54711914 326.1446582 320.54711914 339.0146582 320.54711914 352.2746582 C151.58711914 352.2746582 -17.37288086 352.2746582 -191.45288086 352.2746582 C-191.45288086 339.4046582 -191.45288086 326.5346582 -191.45288086 313.2746582 C-181.55288086 313.2746582 -171.65288086 313.2746582 -161.45288086 313.2746582 C-161.45954269 310.51927704 -161.46620453 307.76389587 -161.47306824 304.92501831 C-161.53432577 278.99704959 -161.57899662 253.0690904 -161.60831738 227.1410656 C-161.62379293 213.81023558 -161.64489564 200.47947642 -161.67919922 187.14868164 C-161.70908043 175.53094483 -161.72845086 163.91324644 -161.73514634 152.29547226 C-161.73906074 146.14271229 -161.74827459 139.99006226 -161.77007103 133.83733749 C-161.79041588 128.04752509 -161.79671866 122.25786805 -161.7922039 116.4680233 C-161.79302999 114.34195932 -161.79900746 112.2158902 -161.81049728 110.0898571 C-161.82540987 107.18844667 -161.82183878 104.28762382 -161.81364441 101.38619995 C-161.82238293 100.54377743 -161.83112146 99.7013549 -161.84012479 98.83340442 C-161.8024558 93.90321534 -161.17425328 90.54835291 -158.45288086 86.2746582 C-130.94077079 59.95872683 -82.52445089 79.2746582 -44.45288086 79.2746582 C-44.12288086 156.4946582 -43.79288086 233.7146582 -43.45288086 313.2746582 C-39.82288086 313.2746582 -36.19288086 313.2746582 -32.45288086 313.2746582 C-32.45656803 311.73499106 -32.4602552 310.19532393 -32.46405411 308.60900021 C-32.55067466 272.06516727 -32.61663748 235.5213486 -32.65714218 198.97743442 C-32.66214504 194.48007329 -32.66732232 189.98271237 -32.67260742 185.48535156 C-32.67365666 184.5900033 -32.67470591 183.69465505 -32.67578694 182.77217502 C-32.69319491 168.27245147 -32.72473476 153.77279131 -32.76149204 139.27310538 C-32.79889056 124.39646228 -32.82111441 109.5198524 -32.82923484 94.64316422 C-32.83472487 85.46251177 -32.85206824 76.28203851 -32.88454673 67.10144121 C-32.90568117 60.8070177 -32.91208334 54.5126869 -32.90688637 48.21823048 C-32.9043229 44.5859374 -32.90826833 40.95395758 -32.92970276 37.32172012 C-32.95277656 33.38289742 -32.94483427 29.44448292 -32.93389893 25.50559998 C-32.94555029 24.35870538 -32.95720166 23.21181078 -32.96920609 22.0301618 C-32.91045523 14.21837576 -31.77467089 9.68872018 -26.20288086 3.9621582 C-18.2790678 -0.90018163 -8.96280403 -0.016513 0 0 Z M40.54711914 14.2746582 C39.6718457 14.63688477 38.79657227 14.99911133 37.89477539 15.37231445 C20.36653556 23.3396962 9.97293913 37.86629341 3.37915039 55.3762207 C-1.49480964 71.9888732 1.43476435 89.75721179 9.39868164 104.8449707 C18.5517455 120.22177029 33.84656921 130.68249294 50.98461914 135.1496582 C67.40340857 138.43735345 83.15109588 135.61542415 97.57836914 127.2590332 C102.37833046 124.050638 106.49687136 120.37508605 110.54711914 116.2746582 C111.18262695 115.66106445 111.81813477 115.0474707 112.47290039 114.4152832 C123.76016808 102.7025531 128.09531036 86.61460816 127.96704102 70.72167969 C127.351351 53.15280714 119.64747232 37.62330656 107.02075195 25.59985352 C92.34258316 12.40020139 75.26302521 9.4530004 56.21362305 10.09106445 C50.61033723 10.4768611 45.69864411 12.03964381 40.54711914 14.2746582 Z M-132.45288086 125.2746582 C-132.45288086 133.5246582 -132.45288086 141.7746582 -132.45288086 150.2746582 C-124.20288086 150.2746582 -115.95288086 150.2746582 -107.45288086 150.2746582 C-107.45288086 142.0246582 -107.45288086 133.7746582 -107.45288086 125.2746582 C-115.70288086 125.2746582 -123.95288086 125.2746582 -132.45288086 125.2746582 Z M-92.45288086 125.2746582 C-92.45288086 133.5246582 -92.45288086 141.7746582 -92.45288086 150.2746582 C-84.20288086 150.2746582 -75.95288086 150.2746582 -67.45288086 150.2746582 C-67.45288086 142.0246582 -67.45288086 133.7746582 -67.45288086 125.2746582 C-75.70288086 125.2746582 -83.95288086 125.2746582 -92.45288086 125.2746582 Z M203.54711914 125.2746582 C203.54711914 133.5246582 203.54711914 141.7746582 203.54711914 150.2746582 C211.79711914 150.2746582 220.04711914 150.2746582 228.54711914 150.2746582 C228.54711914 142.0246582 228.54711914 133.7746582 228.54711914 125.2746582 C220.29711914 125.2746582 212.04711914 125.2746582 203.54711914 125.2746582 Z M243.54711914 125.2746582 C243.54711914 133.5246582 243.54711914 141.7746582 243.54711914 150.2746582 C251.79711914 150.2746582 260.04711914 150.2746582 268.54711914 150.2746582 C268.54711914 142.0246582 268.54711914 133.7746582 268.54711914 125.2746582 C260.29711914 125.2746582 252.04711914 125.2746582 243.54711914 125.2746582 Z M-132.45288086 169.2746582 C-132.45288086 177.5246582 -132.45288086 185.7746582 -132.45288086 194.2746582 C-124.20288086 194.2746582 -115.95288086 194.2746582 -107.45288086 194.2746582 C-107.45288086 186.0246582 -107.45288086 177.7746582 -107.45288086 169.2746582 C-115.70288086 169.2746582 -123.95288086 169.2746582 -132.45288086 169.2746582 Z M-92.45288086 169.2746582 C-92.45288086 177.5246582 -92.45288086 185.7746582 -92.45288086 194.2746582 C-84.20288086 194.2746582 -75.95288086 194.2746582 -67.45288086 194.2746582 C-67.45288086 186.0246582 -67.45288086 177.7746582 -67.45288086 169.2746582 C-75.70288086 169.2746582 -83.95288086 169.2746582 -92.45288086 169.2746582 Z M203.54711914 169.2746582 C203.54711914 177.5246582 203.54711914 185.7746582 203.54711914 194.2746582 C211.79711914 194.2746582 220.04711914 194.2746582 228.54711914 194.2746582 C228.54711914 186.0246582 228.54711914 177.7746582 228.54711914 169.2746582 C220.29711914 169.2746582 212.04711914 169.2746582 203.54711914 169.2746582 Z M243.54711914 169.2746582 C243.54711914 177.5246582 243.54711914 185.7746582 243.54711914 194.2746582 C251.79711914 194.2746582 260.04711914 194.2746582 268.54711914 194.2746582 C268.54711914 186.0246582 268.54711914 177.7746582 268.54711914 169.2746582 C260.29711914 169.2746582 252.04711914 169.2746582 243.54711914 169.2746582 Z M-132.45288086 215.2746582 C-132.45288086 223.5246582 -132.45288086 231.7746582 -132.45288086 240.2746582 C-124.20288086 240.2746582 -115.95288086 240.2746582 -107.45288086 240.2746582 C-107.45288086 232.0246582 -107.45288086 223.7746582 -107.45288086 215.2746582 C-115.70288086 215.2746582 -123.95288086 215.2746582 -132.45288086 215.2746582 Z M-92.45288086 215.2746582 C-92.45288086 223.5246582 -92.45288086 231.7746582 -92.45288086 240.2746582 C-84.20288086 240.2746582 -75.95288086 240.2746582 -67.45288086 240.2746582 C-67.45288086 232.0246582 -67.45288086 223.7746582 -67.45288086 215.2746582 C-75.70288086 215.2746582 -83.95288086 215.2746582 -92.45288086 215.2746582 Z M203.54711914 215.2746582 C203.54711914 223.5246582 203.54711914 231.7746582 203.54711914 240.2746582 C211.79711914 240.2746582 220.04711914 240.2746582 228.54711914 240.2746582 C228.54711914 232.0246582 228.54711914 223.7746582 228.54711914 215.2746582 C220.29711914 215.2746582 212.04711914 215.2746582 203.54711914 215.2746582 Z M243.54711914 215.2746582 C243.54711914 223.5246582 243.54711914 231.7746582 243.54711914 240.2746582 C251.79711914 240.2746582 260.04711914 240.2746582 268.54711914 240.2746582 C268.54711914 232.0246582 268.54711914 223.7746582 268.54711914 215.2746582 C260.29711914 215.2746582 252.04711914 215.2746582 243.54711914 215.2746582 Z M29.54711914 218.2746582 C29.54711914 249.2946582 29.54711914 280.3146582 29.54711914 312.2746582 C54.29711914 312.2746582 79.04711914 312.2746582 104.54711914 312.2746582 C104.54711914 281.2546582 104.54711914 250.2346582 104.54711914 218.2746582 C79.79711914 218.2746582 55.04711914 218.2746582 29.54711914 218.2746582 Z " fill="#000000" transform="translate(191.452880859375,79.725341796875)"/>
  <path d="M0 0 C10.56 0 21.12 0 32 0 C32 7.92 32 15.84 32 24 C40.25 24 48.5 24 57 24 C57 34.89 57 45.78 57 57 C48.75 57 40.5 57 32 57 C32 64.92 32 72.84 32 81 C21.44 81 10.88 81 0 81 C0 73.08 0 65.16 0 57 C-8.25 57 -16.5 57 -25 57 C-25 46.11 -25 35.22 -25 24 C-16.75 24 -8.5 24 0 24 C0 16.08 0 8.16 0 0 Z " fill="#000000" transform="translate(240,112)"/>
</svg>`


        };

        const iconKey = platformName.toLowerCase();

        const iconSvg = icons[iconKey] || `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#95a5a6">
        <circle cx="12" cy="12" r="10"/>
    </svg>`;

        return `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;
    }

    private generateNoDataHtml(logoDataUri: string, footerBorderDataUri: string, month: string, customerName: string): string {
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
            color: #95a5a6;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
.hospital-table {
    background-color: #f0f8ff;
}
.hospital-table th {
    background-color: #0066cc;
    color: white;
}
.hospital-table tr:nth-child(even) {
    background-color: #e6f2ff;
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

            // Remove contact line HTML from intro and thank you pages before PDF generation
            const cleanedHtml = this.removeContactLineFromIntroAndThankYouPages(html);
            console.log('Contact line HTML cleaned from intro and thank you pages');

            browser = await playwright.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('Browser launched');

            const context = await browser.newContext();
            const page = await context.newPage();
            console.log('New page created');

            await page.setContent(cleanedHtml, { waitUntil: 'networkidle0' });
            console.log('Content set');

            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '30px',
                    right: '0px',
                    bottom: '10px',
                    left: '0px'
                },
                printBackground: true,
                preferCSSPageSize: true,  // Important for proper sizing
                displayHeaderFooter: false // Ensure no headers/footers are added

                //timeout: 60000 // Increase timeout to 60 seconds

            });
            console.log('PDF generated');

            // // Save to file for inspection (optional)
            // fs.writeFileSync('debug-report-playwright.pdf', pdfBuffer);
            // console.log('PDF saved to debug-report-playwright.pdf');


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

    private removeContactLineFromIntroAndThankYouPages(html: string): string {
        // Keep the contact line visible in main content but hidden on intro and thank-you pages
        // The CSS rules already handle this properly by default, but we need to ensure no conflicts
        let cleanHtml = html;

        // Ensure the contact line CSS is correctly applied
        // The existing CSS already handles hiding contact-line on intro/thank-you pages
        // and showing it on main-content pages

        // Make sure contact line is visible in main content by ensuring the CSS is not removed
        // The CSS already has:
        // .contact-line { display: none !important; ... } - hidden by default
        // .main-content .contact-line { display: flex !important; ... } - visible in main content
        // .intro-page .contact-line, .thank-you-page .contact-line { display: none !important; ... } - hidden on intro/thank-you

        return cleanHtml;
    }

}
