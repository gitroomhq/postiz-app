import { Injectable } from '@nestjs/common';
import {Interval} from '@nestjs/schedule';
import {isDev} from "@gitroom/helpers/utils/is.dev";

@Injectable()
export class CheckTrending {
    @Interval(isDev() ? 10000 : 3600000)
    CheckTrending() {
        console.log('hello');
    }
}