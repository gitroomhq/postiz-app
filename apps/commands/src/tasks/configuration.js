import { __decorate, __metadata } from "tslib";
import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ConfigurationChecker } from "../../../../libraries/helpers/src/configuration/configuration.checker";
let ConfigurationTask = class ConfigurationTask {
    create() {
        const checker = new ConfigurationChecker();
        checker.readEnvFromProcess();
        checker.check();
        if (checker.hasIssues()) {
            for (const issue of checker.getIssues()) {
                console.warn('Configuration issue:', issue);
            }
            console.error('Configuration check complete, issues: ', checker.getIssuesCount());
        }
        else {
            console.log('Configuration check complete, no issues found.');
        }
        console.log('Press Ctrl+C to exit.');
        return true;
    }
};
__decorate([
    Command({
        command: 'config:check',
        describe: 'Checks your configuration (.env) file for issues.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigurationTask.prototype, "create", null);
ConfigurationTask = __decorate([
    Injectable()
], ConfigurationTask);
export { ConfigurationTask };
//# sourceMappingURL=configuration.js.map