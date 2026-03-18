import { __awaiter, __decorate, __metadata } from "tslib";
import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AgentGraphService } from "../../../../libraries/nestjs-libraries/src/agent/agent.graph.service";
let AgentRun = class AgentRun {
    constructor(_agentGraphService) {
        this._agentGraphService = _agentGraphService;
    }
    agentRun() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(yield this._agentGraphService.createGraph('hello', true));
        });
    }
};
__decorate([
    Command({
        command: 'run:agent',
        describe: 'Run the agent',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentRun.prototype, "agentRun", null);
AgentRun = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AgentGraphService])
], AgentRun);
export { AgentRun };
//# sourceMappingURL=agent.run.js.map