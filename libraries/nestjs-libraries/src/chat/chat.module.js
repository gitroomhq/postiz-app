import { __decorate } from "tslib";
import { Global, Module } from '@nestjs/common';
import { LoadToolsService } from "./load.tools.service";
import { MastraService } from "./mastra.service";
import { toolList } from "./tools/tool.list";
let ChatModule = class ChatModule {
};
ChatModule = __decorate([
    Global(),
    Module({
        providers: [MastraService, LoadToolsService, ...toolList],
        get exports() {
            return this.providers;
        },
    })
], ChatModule);
export { ChatModule };
//# sourceMappingURL=chat.module.js.map