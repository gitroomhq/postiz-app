import { __awaiter } from "tslib";
import 'source-map-support/register';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { NestFactory } from '@nestjs/core';
import { AppModule } from "./app.module";
import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        // some comment again
        const app = yield NestFactory.createApplicationContext(AppModule);
        app.enableShutdownHooks();
    });
}
bootstrap();
//# sourceMappingURL=main.js.map