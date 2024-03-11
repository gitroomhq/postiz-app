import {Body, Controller, Get, Post} from '@nestjs/common';
import {Organization} from "@prisma/client";
import {GetOrgFromRequest} from "@gitroom/nestjs-libraries/user/org.from.request";
import {StarsService} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.service";
import dayjs from "dayjs";
import {mean} from 'simple-statistics';
import {StarsListDto} from "@gitroom/nestjs-libraries/dtos/analytics/stars.list.dto";
import {ApiTags} from "@nestjs/swagger";

@ApiTags('Analytics')
@Controller('/analytics')
export class AnalyticsController {
    constructor(
        private _starsService: StarsService
    ) {
    }
    @Get('/')
    async getStars(
        @GetOrgFromRequest() org: Organization
    ) {
        return this._starsService.getStars(org.id);
    }

    @Get('/trending')
    async getTrending() {
        const trendings = (await this._starsService.getTrending('')).reverse();
        const dates = trendings.map(result => dayjs(result.date).toDate());
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const intervals = dates.slice(1).map((date, i) => (date - dates[i]) / (1000 * 60 * 60 * 24));
        const nextInterval = intervals.length === 0 ? null : mean(intervals);
        const lastTrendingDate = dates[dates.length - 1];
        const nextTrendingDate = !nextInterval ? 'Not possible yet' : dayjs(new Date(lastTrendingDate.getTime() + nextInterval * 24 * 60 * 60 * 1000)).format('YYYY-MM-DD HH:mm:ss');

        return {
            last: dayjs(lastTrendingDate).format('YYYY-MM-DD HH:mm:ss'),
            predictions: nextTrendingDate
        }
    }

    @Post('/stars')
    async getStarsFilter(
        @GetOrgFromRequest() org: Organization,
        @Body() starsFilter: StarsListDto
    ) {
        return {stars: await this._starsService.getStarsFilter(org.id, starsFilter)};
    }
}
