import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportService } from '../../services/report/report.service';
import { format, parse, isBefore, isValid, differenceInDays } from 'date-fns';
import * as pdf from 'html-pdf';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

@ApiTags('Report Downloads')
@Controller('report-download')
export class ReportDownloadController {
	private readonly chartJSNodeCanvas: ChartJSNodeCanvas;

	constructor(private readonly reportService: ReportService) {
		this.chartJSNodeCanvas = new ChartJSNodeCanvas({
			width: 800,
			height: 400,
			backgroundColour: 'white',
		});
	}

	@Get('instagram')
	@ApiOperation({ summary: 'Download Instagram report as PDF' })
	async downloadInstagramReport(
		@Query('businessId') businessId: string,
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
		@Res() res: Response
	) {
		try {
			// Validate and parse dates
			const parsedStartDate = this.parseDate(startDate);
			const parsedEndDate = this.parseDate(endDate);

			if (isBefore(parsedEndDate, parsedStartDate)) {
				throw new BadRequestException('End date must be after start date');
			}

			const days = differenceInDays(parsedEndDate, parsedStartDate) + 1;

			// Get data for the specified date range
			const [communityReport, overviewReport] = await Promise.all([
				this.reportService.getInstagramCommunityReport(businessId, days.toString()),
				this.reportService.getInstagramOverviewReport(businessId, days.toString())
			]);

			// Calculate dynamic label interval based on date range
			const labelInterval = Math.max(1, Math.floor(days / 10));

			// Generate all chart images with dynamic date spacing
			const [profileChart, communityChart, followersChart, impressionsChart] = await Promise.all([
				this.generateDynamicChart('line', overviewReport.chart, 'Impressions', '#4CAF50', 'rgba(76, 175, 80, 0.1)', parsedStartDate, parsedEndDate, labelInterval, 'Profile Performance'),
				this.generateDynamicChart('bar', communityReport.chart, ['Followers', 'Following'], ['rgba(75, 192, 192, 0.8)', 'rgba(255, 159, 64, 0.8)'], undefined, parsedStartDate, parsedEndDate, labelInterval, 'Community Growth', true),
				this.generateDynamicChart('bar', communityReport.chart, 'Followers Growth', 'rgba(75, 192, 192, 0.6)', undefined, parsedStartDate, parsedEndDate, labelInterval, 'Followers Growth'),
				this.generateDynamicChart('bar', overviewReport.chart, 'Impressions', 'rgba(153, 102, 255, 0.6)', undefined, parsedStartDate, parsedEndDate, labelInterval, 'Impressions')
			]);

			// Generate HTML for PDF
			const html = this.generateInstagramHtml(
				communityReport,
				overviewReport,
				parsedStartDate,
				parsedEndDate,
				profileChart,
				communityChart,
				followersChart,
				impressionsChart
			);

			// PDF options
			const options: pdf.CreateOptions = {
				format: 'A4',
				border: {
					top: '0.5in',
					right: '0.5in',
					bottom: '0.5in',
					left: '0.5in'
				}
			};

			// Create and stream PDF
			pdf.create(html, options).toStream((err, stream) => {
				if (err) {
					console.error('PDF generation error:', err);
					return res.status(500).send('Error generating PDF');
				}
				res.setHeader('Content-Type', 'application/pdf');
				res.setHeader('Content-Disposition', `attachment; filename=instagram-report-${businessId}-${format(parsedStartDate, 'yyyy-MM-dd')}-to-${format(parsedEndDate, 'yyyy-MM-dd')}.pdf`);
				stream.pipe(res);
			});
		} catch (error) {
			console.error('Report generation error:', error);
			if (error instanceof BadRequestException) {
				res.status(400).send(error.message);
			} else {
				res.status(500).send('Error generating report');
			}
		}
	}

	private async generateDynamicChart(
		type: 'line' | 'bar',
		chartData: any[],
		label: string | string[],
		backgroundColor: string | string[],
		backgroundFill: string | undefined,
		startDate: Date,
		endDate: Date,
		interval: number,
		title: string,
		showLegend: boolean = false
	): Promise<string> {
		// Filter data based on dynamic interval
		const filteredData = chartData.filter((_, index) => index % interval === 0);

		// Prepare datasets based on input parameters
		const datasets = Array.isArray(label) ?
			label.map((l, i) => ({
				label: l,
				data: filteredData.map(item => item[l.toLowerCase().replace(' ', '')]),
				backgroundColor: Array.isArray(backgroundColor) ? backgroundColor[i] : backgroundColor,
				borderColor: Array.isArray(backgroundColor) ? backgroundColor[i] : backgroundColor,
				borderWidth: 1,
				fill: !!backgroundFill
			})) : [{
				label,
				data: filteredData.map(item => item[label.toLowerCase().replace(' ', '')]),
				backgroundColor,
				borderColor: backgroundColor,
				borderWidth: 1,
				fill: !!backgroundFill,
				...(type === 'line' ? { tension: 0.3 } : {})
			}];

		const configuration: ChartConfiguration<typeof type> = {
			type,
			data: {
				labels: filteredData.map(item => format(new Date(item.date), 'MMM d')),
				datasets: datasets as any
			},
			options: {
				responsive: true,
				plugins: {
					legend: {
						display: showLegend,
						position: 'top',
						labels: {
							boxWidth: 12,
							padding: 20,
							usePointStyle: true,
							pointStyle: 'circle'
						}
					},
					title: {
						display: true,
						text: `${title} (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`,
						font: { size: 16 }
					}
				},
				scales: {
					y: { beginAtZero: false },
					x: {
						ticks: {
							autoSkip: false,
							maxRotation: 45,
							minRotation: 45
						}
					}
				}
			}
		};

		const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
		return `data:image/png;base64,${imageBuffer.toString('base64')}`;
	}



	// ... (rest of the methods remain the same)

	// private async generateCommunityChart(chartData: any[], startDate: Date, endDate: Date, interval: number): Promise<string> {
	// 	const filteredData = this.getFilteredChartData(chartData, interval);

	// 	const configuration: ChartConfiguration<'bar'> = {
	// 		type: 'bar',
	// 		data: {
	// 			labels: filteredData.map(item => format(new Date(item.date), 'MMM d')),
	// 			datasets: [
	// 				{
	// 					label: 'Followers',
	// 					data: filteredData.map(item => item.followers),
	// 					backgroundColor: 'rgba(75, 192, 192, 0.8)',
	// 					borderColor: 'rgba(75, 192, 192, 1)',
	// 					borderWidth: 1
	// 				},
	// 				{
	// 					label: 'Following',
	// 					data: filteredData.map(item => item.following),
	// 					backgroundColor: 'rgba(255, 159, 64, 0.8)',
	// 					borderColor: 'rgba(255, 159, 64, 1)',
	// 					borderWidth: 1
	// 				}
	// 			]
	// 		},
	// 		options: {
	// 			responsive: true,
	// 			plugins: {
	// 				legend: {
	// 					position: 'top',
	// 					labels: {
	// 						boxWidth: 12,
	// 						padding: 20,
	// 						usePointStyle: true,
	// 						pointStyle: 'circle'
	// 					}
	// 				},
	// 				title: {
	// 					display: true,
	// 					text: `Community Growth (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`,
	// 					font: { size: 16 }
	// 				}
	// 			},
	// 			scales: {
	// 				y: { beginAtZero: false },
	// 				x: {
	// 					ticks: {
	// 						autoSkip: false,
	// 						maxRotation: 45,
	// 						minRotation: 45
	// 					}
	// 				}
	// 			}
	// 		}
	// 	};

	// 	const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
	// 	return `data:image/png;base64,${imageBuffer.toString('base64')}`;
	// }

	// private async generateCommunityChart(chartData: any[], startDate: Date, endDate: Date): Promise<string> {
	// 	const configuration = {
	// 		type: 'bar',
	// 		data: {
	// 			labels: chartData.map(item => format(new Date(item.date), 'MMM d')),
	// 			datasets: [
	// 				{
	// 					label: 'Followers',
	// 					data: chartData.map(item => item.followers),
	// 					backgroundColor: 'rgba(75, 192, 192, 0.8)',
	// 					borderColor: 'rgba(75, 192, 192, 1)',
	// 					borderWidth: 1
	// 				},
	// 				{
	// 					label: 'Following',
	// 					data: chartData.map(item => item.following),
	// 					backgroundColor: 'rgba(255, 159, 64, 0.8)',
	// 					borderColor: 'rgba(255, 159, 64, 1)',
	// 					borderWidth: 1
	// 				}
	// 			]
	// 		},
	// 		options: {
	// 			responsive: true,
	// 			plugins: {
	// 				legend: {
	// 					position: 'top',
	// 					labels: {
	// 						boxWidth: 12,
	// 						padding: 20,
	// 						usePointStyle: true,
	// 						pointStyle: 'circle'
	// 					}
	// 				},
	// 				title: {
	// 					display: true,
	// 					text: `Community Growth (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`,
	// 					font: { size: 16 }
	// 				}
	// 			},
	// 			scales: { y: { beginAtZero: false } }
	// 		}
	// 	};

	// 	const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
	// 	return `data:image/png;base64,${imageBuffer.toString('base64')}`;
	// }

	// private async generateFollowersChart(chartData: any[], startDate: Date, endDate: Date): Promise<string> {
	// 	const configuration = {
	// 		type: 'bar',
	// 		data: {
	// 			labels: chartData.map(item => format(new Date(item.date), 'MMM d')),
	// 			datasets: [{
	// 				label: 'Followers Growth',
	// 				data: chartData.map(item => item.followers),
	// 				backgroundColor: 'rgba(75, 192, 192, 0.6)',
	// 				borderColor: 'rgba(75, 192, 192, 1)',
	// 				borderWidth: 1
	// 			}]
	// 		},
	// 		options: {
	// 			responsive: true,
	// 			plugins: {
	// 				legend: { display: false },
	// 				title: {
	// 					display: true,
	// 					text: `Followers Growth (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`,
	// 					font: { size: 16 }
	// 				}
	// 			},
	// 			scales: { y: { beginAtZero: false } }
	// 		}
	// 	};

	// 	const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
	// 	return `data:image/png;base64,${imageBuffer.toString('base64')}`;
	// }

	// private async generateImpressionsChart(chartData: any[], startDate: Date, endDate: Date): Promise<string> {
	// 	const configuration = {
	// 		type: 'bar',
	// 		data: {
	// 			labels: chartData.map(item => format(new Date(item.date), 'MMM d')),
	// 			datasets: [{
	// 				label: 'Impressions',
	// 				data: chartData.map(item => item.impressions),
	// 				backgroundColor: 'rgba(153, 102, 255, 0.6)',
	// 				borderColor: 'rgba(153, 102, 255, 1)',
	// 				borderWidth: 1
	// 			}]
	// 		},
	// 		options: {
	// 			responsive: true,
	// 			plugins: {
	// 				legend: { display: false },
	// 				title: {
	// 					display: true,
	// 					text: `Impressions (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`,
	// 					font: { size: 16 }
	// 				}
	// 			},
	// 			scales: { y: { beginAtZero: false } }
	// 		}
	// 	};

	// 	const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
	// 	return `data:image/png;base64,${imageBuffer.toString('base64')}`;
	// }

	private generateInstagramHtml(
		communityReport: any,
		overviewReport: any,
		startDate: Date,
		endDate: Date,
		profileChart: string,
		communityChart: string,
		followersChart: string,
		impressionsChart: string
	): string {
		const lastCommunityData = communityReport.chart[communityReport.chart.length - 1];
		const lastOverviewData = overviewReport.chart[overviewReport.chart.length - 1];

		return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
          }
          .date-range {
            color: #666;
            font-size: 14px;
          }
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
          }
          .chart-container {
            margin: 20px 0;
            height: 300px;
          }
          .stats-container {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
          }
          .stat-box {
            border: 1px solid #e1e1e1;
            padding: 15px;
            border-radius: 8px;
            width: 30%;
            text-align: center;
            background-color: #f9f9f9;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .stat-label {
            color: #666;
            font-size: 14px;
          }
          .up {
            color: #4CAF50;
            font-size: 18px;
            vertical-align: middle;
          }
          .divider {
            border-top: 1px solid #eee;
            margin: 20px 0;
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
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            font-weight: bold;
          }
          .table-container {
            background-color: #f9f9f9;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 16px;
          }
          .grid-item {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .growth-text {
            margin-top: 12px;
            font-size: 14px;
          }
          .chart-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Instagram Analytics Report</h1>
          <div class="date-range">${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}</div>
        </div>

        <!-- Profile Overview Section -->
        <div class="section">
          <div class="section-title">Profile Overview</div>
          <div class="chart-container">
            <img src="${profileChart}" class="chart-img" />
          </div>
          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-value">${this.formatNumber(lastOverviewData?.impressions || 0)}</div>
              <div class="stat-label">Impressions</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${lastOverviewData?.avgReachPerDay || 0}</div>
              <div class="stat-label">Avg. reach per day</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${lastOverviewData?.totalContent || 0}</div>
              <div class="stat-label">Total content</div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Community Section -->
        <div class="section">
          <div class="section-title">Community</div>
          ${this.generateCommunityTable(communityReport.table)}
          
          <div class="chart-grid">
            <div>
              <div class="section-title">Community Growth</div>
              <div class="chart-container">
                <img src="${communityChart}" class="chart-img" />
              </div>
            </div>
            <div>
              <div class="section-title">Followers Growth</div>
              <div class="chart-container">
                <img src="${followersChart}" class="chart-img" />
              </div>
            </div>
          </div>
          
          <div class="grid-container">
            <div class="grid-item">
              <div class="stat-value">${this.formatNumber(lastCommunityData?.followers || 0)} <span class="up">↑</span></div>
              <div class="stat-label">Followers</div>
            </div>
            <div class="grid-item">
              <div class="stat-value">${lastCommunityData?.following || 0}</div>
              <div class="stat-label">Following</div>
            </div>
            <div class="grid-item">
              <div class="stat-value">${lastCommunityData?.totalContent || 0}</div>
              <div class="stat-label">Total content</div>
            </div>
          </div>
          ${communityReport.table.Growth ? `<div class="growth-text">Growth: ${communityReport.table.Growth}</div>` : ''}
        </div>

        <div class="divider"></div>

        <!-- Overview Section -->
        <div class="section">
          <div class="section-title">Overview</div>
          ${this.generateOverviewTable(overviewReport.table)}
          
          <div class="section-title">Impressions</div>
          <div class="chart-container">
            <img src="${impressionsChart}" class="chart-img" />
          </div>
          <div class="grid-container">
            <div class="grid-item">
              <div class="stat-value">${this.formatNumber(lastOverviewData?.impressions || 0)}</div>
              <div class="stat-label">Impressions</div>
            </div>
            <div class="grid-item">
              <div class="stat-value">${lastOverviewData?.avgReachPerDay || 0}</div>
              <div class="stat-label">Avg Reach</div>
            </div>
            <div class="grid-item">
              <div class="stat-value">${lastOverviewData?.totalContent || 0}</div>
              <div class="stat-label">Total Content</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
	}

	private generateCommunityTable(tableData: any): string {
		if (!tableData) return '';

		return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              ${tableData.Data.slice(0, -1).map((month: string) => `
                <th>${month}</th>
              `).join('')}
              <th>${tableData.Data[tableData.Data.length - 1]}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Followers</td>
              ${tableData.Followers.slice(0, -1).map((value: string) => `
                <td>${value}</td>
              `).join('')}
              <td>${tableData.Followers[tableData.Followers.length - 1]}</td>
            </tr>
            <tr>
              <td>Following</td>
              ${tableData.Following.slice(0, -1).map((value: string) => `
                <td>${value}</td>
              `).join('')}
              <td>${tableData.Following[tableData.Following.length - 1]}</td>
            </tr>
            <tr>
              <td><strong>Total Content</strong></td>
              ${tableData.TotalContent.slice(0, -1).map((value: string) => `
                <td><strong>${value}</strong></td>
              `).join('')}
              <td><strong>${tableData.TotalContent[tableData.TotalContent.length - 1]}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
	}

	private generateOverviewTable(tableData: any): string {
		if (!tableData) return '';

		return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              ${tableData.Data.slice(0, -1).map((month: string) => `
                <th>${month}</th>
              `).join('')}
              <th>${tableData.Data[tableData.Data.length - 1]}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Impressions</td>
              ${tableData.Impressions.slice(0, -1).map((value: string) => `
                <td>${value}</td>
              `).join('')}
              <td>${tableData.Impressions[tableData.Impressions.length - 1]}</td>
            </tr>
            <tr>
              <td>Avg Reach Per Day</td>
              ${tableData.AvgReachPerDay.slice(0, -1).map((value: string) => `
                <td>${value}</td>
              `).join('')}
              <td>${tableData.AvgReachPerDay[tableData.AvgReachPerDay.length - 1]}</td>
            </tr>
            <tr>
              <td><strong>Total Content</strong></td>
              ${tableData.TotalContent.slice(0, -1).map((value: string) => `
                <td><strong>${value}</strong></td>
              `).join('')}
              <td><strong>${tableData.TotalContent[tableData.TotalContent.length - 1]}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
	}

	private parseDate(dateString: string): Date {
		const formats = ['yyyy-MM-dd', 'dd-MM-yyyy', 'MM-dd-yyyy'];
		for (const fmt of formats) {
			const parsedDate = parse(dateString, fmt, new Date());
			if (isValid(parsedDate)) return parsedDate;
		}
		throw new BadRequestException(`Invalid date format: ${dateString}. Please use YYYY-MM-DD format`);
	}

	private formatNumber(num: number | string): string {
		const number = typeof num === 'string' ? parseInt(num, 10) : num;
		if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
		if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
		return number.toString();
	}
}