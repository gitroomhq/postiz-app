import { __awaiter } from "tslib";
import i18next from './i18next';
import { headerName } from './i18n.config';
import { headers } from 'next/headers';
export function getT(ns, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const headerList = yield headers();
        const lng = headerList.get(headerName);
        if (lng && i18next.resolvedLanguage !== lng) {
            yield i18next.changeLanguage(lng);
        }
        if (ns && !i18next.hasLoadedNamespace(ns)) {
            yield i18next.loadNamespaces(ns);
        }
        return i18next.getFixedT(lng !== null && lng !== void 0 ? lng : i18next.resolvedLanguage, Array.isArray(ns) ? ns[0] : ns, options === null || options === void 0 ? void 0 : options.keyPrefix);
    });
}
//# sourceMappingURL=get.translation.service.backend.js.map