"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.religareProfileLimit = religareProfileLimit;
function religareProfileLimit(tier) {
    switch (tier) {
        case 'STANDARD':
            return 5;
        case 'TEAM':
        case 'PRO':
        case 'ULTIMATE':
            return Infinity;
        default:
            return 1;
    }
}
//# sourceMappingURL=religare-limits.js.map