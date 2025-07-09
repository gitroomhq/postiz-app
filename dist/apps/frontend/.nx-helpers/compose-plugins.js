"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composePlugins = composePlugins;
function composePlugins(...plugins) {
    return function (baseConfig) {
        return async function combined(phase, context) {
            let config = baseConfig;
            for (const plugin of plugins) {
                const fn = await plugin;
                const configOrFn = fn(config);
                if (typeof configOrFn === 'function') {
                    config = await configOrFn(phase, context);
                }
                else {
                    config = configOrFn;
                }
            }
            return config;
        };
    };
}
