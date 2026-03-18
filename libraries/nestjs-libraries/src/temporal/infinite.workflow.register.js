import { __awaiter, __decorate, __metadata } from "tslib";
import { Global, Injectable, Module } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
let InfiniteWorkflowRegister = class InfiniteWorkflowRegister {
    constructor(_temporalService) {
        this._temporalService = _temporalService;
    }
    onModuleInit() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!!process.env.RUN_CRON) {
                try {
                    yield ((_c = (_b = (_a = this._temporalService.client) === null || _a === void 0 ? void 0 : _a.getRawClient()) === null || _b === void 0 ? void 0 : _b.workflow) === null || _c === void 0 ? void 0 : _c.start('missingPostWorkflow', {
                        workflowId: 'missing-post-workflow',
                        taskQueue: 'main',
                    }));
                }
                catch (err) { }
            }
        });
    }
};
InfiniteWorkflowRegister = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [TemporalService])
], InfiniteWorkflowRegister);
export { InfiniteWorkflowRegister };
let InfiniteWorkflowRegisterModule = class InfiniteWorkflowRegisterModule {
};
InfiniteWorkflowRegisterModule = __decorate([
    Global(),
    Module({
        imports: [],
        controllers: [],
        providers: [InfiniteWorkflowRegister],
        get exports() {
            return this.providers;
        },
    })
], InfiniteWorkflowRegisterModule);
export { InfiniteWorkflowRegisterModule };
//# sourceMappingURL=infinite.workflow.register.js.map