import { __decorate } from "tslib";
import { Module } from '@nestjs/common';
import { CommandModule as ExternalCommandModule } from 'nestjs-command';
import { DatabaseModule } from "../../../libraries/nestjs-libraries/src/database/prisma/database.module";
import { RefreshTokens } from './tasks/refresh.tokens';
import { ConfigurationTask } from './tasks/configuration';
import { AgentRun } from './tasks/agent.run';
import { AgentModule } from "../../../libraries/nestjs-libraries/src/agent/agent.module";
let CommandModule = class CommandModule {
};
CommandModule = __decorate([
    Module({
        imports: [ExternalCommandModule, DatabaseModule, AgentModule],
        controllers: [],
        providers: [RefreshTokens, ConfigurationTask, AgentRun],
        get exports() {
            return [...this.imports, ...this.providers];
        },
    })
], CommandModule);
export { CommandModule };
//# sourceMappingURL=command.module.js.map