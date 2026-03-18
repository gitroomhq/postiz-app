import { __decorate } from "tslib";
import { Global, Module } from '@nestjs/common';
import { AgentGraphService } from "./agent.graph.service";
import { AgentGraphInsertService } from "./agent.graph.insert.service";
let AgentModule = class AgentModule {
};
AgentModule = __decorate([
    Global(),
    Module({
        providers: [AgentGraphService, AgentGraphInsertService],
        get exports() {
            return this.providers;
        },
    })
], AgentModule);
export { AgentModule };
//# sourceMappingURL=agent.module.js.map