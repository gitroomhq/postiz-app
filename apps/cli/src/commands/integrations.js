import { __awaiter } from "tslib";
import { PostizAPI } from '../api';
import { getConfig } from '../config';
export function listIntegrations() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = getConfig();
        const api = new PostizAPI(config);
        try {
            const result = yield api.listIntegrations();
            console.log('🔌 Connected Integrations:');
            console.log(JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.error('❌ Failed to list integrations:', error.message);
            process.exit(1);
        }
    });
}
export function getIntegrationSettings(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = getConfig();
        const api = new PostizAPI(config);
        if (!args.id) {
            console.error('❌ Integration ID is required');
            process.exit(1);
        }
        try {
            const result = yield api.getIntegrationSettings(args.id);
            console.log(`⚙️  Settings for integration: ${args.id}`);
            console.log(JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.error('❌ Failed to get integration settings:', error.message);
            process.exit(1);
        }
    });
}
export function triggerIntegrationTool(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = getConfig();
        const api = new PostizAPI(config);
        if (!args.id) {
            console.error('❌ Integration ID is required');
            process.exit(1);
        }
        if (!args.method) {
            console.error('❌ Method name is required');
            process.exit(1);
        }
        // Parse data from JSON string or use empty object
        let data = {};
        if (args.data) {
            try {
                data = JSON.parse(args.data);
            }
            catch (error) {
                console.error('❌ Failed to parse data JSON:', error.message);
                process.exit(1);
            }
        }
        try {
            const result = yield api.triggerIntegrationTool(args.id, args.method, data);
            console.log(`🔧 Tool result for ${args.method}:`);
            console.log(JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.error('❌ Failed to trigger tool:', error.message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=integrations.js.map