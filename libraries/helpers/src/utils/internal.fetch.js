import { cookies } from 'next/headers';
import { customFetch } from "./custom.fetch.func";
export const internalFetch = (url, options = {}) => {
    var _a, _b, _c, _d;
    return customFetch({ baseUrl: process.env.BACKEND_INTERNAL_URL }, (_b = (_a = cookies()) === null || _a === void 0 ? void 0 : _a.get('auth')) === null || _b === void 0 ? void 0 : _b.value, (_d = (_c = cookies()) === null || _c === void 0 ? void 0 : _c.get('showorg')) === null || _d === void 0 ? void 0 : _d.value)(url, options);
};
//# sourceMappingURL=internal.fetch.js.map