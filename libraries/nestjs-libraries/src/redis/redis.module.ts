import {Global, Module} from "@nestjs/common";
import {RedisService} from "@gitroom/nestjs-libraries/redis/redis.service";

@Global()
@Module({
    imports: [],
    controllers: [],
    providers: [RedisService],
    get exports() {
        return this.providers;
    }
})
export class RedisModule {

}