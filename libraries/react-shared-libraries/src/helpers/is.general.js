import { loadVars } from './variable.context';
export const isGeneral = () => {
    var _a;
    return typeof process.env.IS_GENERAL === 'undefined'
        ? !!process.env.IS_GENERAL
        : (_a = loadVars === null || loadVars === void 0 ? void 0 : loadVars()) === null || _a === void 0 ? void 0 : _a.isGeneral;
};
//# sourceMappingURL=is.general.js.map