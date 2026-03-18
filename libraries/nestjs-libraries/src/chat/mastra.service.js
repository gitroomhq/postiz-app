var MastraService_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { pStore } from "./mastra.store";
import { Injectable } from '@nestjs/common';
import { LoadToolsService } from "./load.tools.service";
let MastraService = MastraService_1 = class MastraService {
    constructor(_loadToolsService) {
        this._loadToolsService = _loadToolsService;
    }
    mastra() {
        return __awaiter(this, void 0, void 0, function* () {
            MastraService_1.mastra =
                MastraService_1.mastra ||
                    new Mastra({
                        storage: pStore,
                        agents: {
                            postiz: yield this._loadToolsService.agent(),
                        },
                        logger: new ConsoleLogger({
                            level: 'info',
                        }),
                    });
            return MastraService_1.mastra;
        });
    }
};
MastraService = MastraService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LoadToolsService])
], MastraService);
export { MastraService };
//# sourceMappingURL=mastra.service.js.map