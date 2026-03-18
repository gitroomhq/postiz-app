import { __awaiter } from "tslib";
export const customFetch = (params, auth, showorg, secured = true) => {
    return function newFetch(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, options = {}) {
            var _a, _b, _c, _d, _e;
            const loggedAuth = typeof window === 'undefined'
                ? undefined
                : new URL(window.location.href).searchParams.get('loggedAuth');
            const newRequestObject = yield ((_a = params === null || params === void 0 ? void 0 : params.beforeRequest) === null || _a === void 0 ? void 0 : _a.call(params, url, options));
            const authNonSecuredCookie = typeof document === 'undefined'
                ? null
                : (_b = document.cookie
                    .split(';')
                    .find((p) => p.includes('auth='))) === null || _b === void 0 ? void 0 : _b.split('=')[1];
            const authNonSecuredOrg = typeof document === 'undefined'
                ? null
                : (_c = document.cookie
                    .split(';')
                    .find((p) => p.includes('showorg='))) === null || _c === void 0 ? void 0 : _c.split('=')[1];
            const authNonSecuredImpersonate = typeof document === 'undefined'
                ? null
                : (_d = document.cookie
                    .split(';')
                    .find((p) => p.includes('impersonate='))) === null || _d === void 0 ? void 0 : _d.split('=')[1];
            const fetchRequest = yield fetch(params.baseUrl + url, Object.assign(Object.assign(Object.assign(Object.assign({}, (secured ? { credentials: 'include' } : {})), (newRequestObject || options)), { headers: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (showorg
                    ? { showorg }
                    : authNonSecuredOrg
                        ? { showorg: authNonSecuredOrg }
                        : {})), (options.body instanceof FormData
                    ? {}
                    : { 'Content-Type': 'application/json' })), { Accept: 'application/json' }), (loggedAuth ? { auth: loggedAuth } : {})), options === null || options === void 0 ? void 0 : options.headers), (auth
                    ? { auth }
                    : authNonSecuredCookie
                        ? { auth: authNonSecuredCookie }
                        : {})), (authNonSecuredImpersonate
                    ? { impersonate: authNonSecuredImpersonate }
                    : {})) }), (!options.next && options.cache !== 'force-cache'
                ? { cache: options.cache || 'no-store' }
                : {})));
            if (!(params === null || params === void 0 ? void 0 : params.afterRequest) ||
                (yield ((_e = params === null || params === void 0 ? void 0 : params.afterRequest) === null || _e === void 0 ? void 0 : _e.call(params, url, options, fetchRequest)))) {
                return fetchRequest;
            }
            // @ts-ignore
            return new Promise((res) => { });
        });
    };
};
export const fetchBackend = customFetch({
    get baseUrl() {
        return process.env.BACKEND_URL;
    },
});
//# sourceMappingURL=custom.fetch.func.js.map