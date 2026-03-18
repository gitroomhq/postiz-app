import { __awaiter } from "tslib";
import { NestFactory } from '@nestjs/core';
import { CommandModule } from './command.module';
import { CommandService } from 'nestjs-command';
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        // some comment again
        const app = yield NestFactory.createApplicationContext(CommandModule, {
            logger: ['error'],
        });
        try {
            yield app.select(CommandModule).get(CommandService).exec();
            yield app.close();
        }
        catch (error) {
            console.error(error);
            yield app.close();
            process.exit(1);
        }
    });
}
bootstrap();
//# sourceMappingURL=main.js.map