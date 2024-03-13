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
        const stars = await this._starsService.predictTrending(10);
        const findFirst = stars.find(star => dayjs(star).isBefore(dayjs()));
        const trendings = (await this._starsService.getTrending('')).reverse();
        const dates = trendings.map(result => dayjs(result.date).toDate());
        const lastTrendingDate = dates[dates.length - 1];

        return {
            last: dayjs(lastTrendingDate).format('YYYY-MM-DD HH:mm:ss'),
            predictions: findFirst
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
