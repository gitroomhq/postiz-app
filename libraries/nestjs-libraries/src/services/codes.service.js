import { __decorate } from "tslib";
import { Injectable } from '@nestjs/common';
import { AuthService } from "../../../helpers/src/auth/auth.service";
let CodesService = class CodesService {
    generateCodes(providerToken) {
        try {
            const decrypt = AuthService.fixedDecryption(providerToken);
            return [...new Array(10000)]
                .map((_, index) => {
                return AuthService.fixedEncryption(`${decrypt}:${index}`);
            })
                .join('\n');
        }
        catch (error) {
            return '';
        }
    }
};
CodesService = __decorate([
    Injectable()
], CodesService);
export { CodesService };
//# sourceMappingURL=codes.service.js.map