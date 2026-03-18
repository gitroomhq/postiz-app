import { __awaiter } from "tslib";
import { useIntegration } from "./use.integration";
import { useCallback } from 'react';
import { useFetch } from "../../../../../../libraries/helpers/src/utils/custom.fetch";
export const useCustomProviderFunction = () => {
    const { integration } = useIntegration();
    const fetch = useFetch();
    const get = useCallback((funcName, customData) => __awaiter(void 0, void 0, void 0, function* () {
        const load = yield fetch('/integrations/function', {
            method: 'POST',
            body: JSON.stringify({
                name: funcName,
                id: integration === null || integration === void 0 ? void 0 : integration.id,
                data: customData,
            }),
        });
        if (load.status > 299 && load.status < 200) {
            throw new Error('Failed to fetch');
        }
        return load.json();
    }), [integration]);
    return {
        get,
    };
};
//# sourceMappingURL=use.custom.provider.function.js.map