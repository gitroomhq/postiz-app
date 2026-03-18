import { __awaiter } from "tslib";
export class EmailEmptyProvider {
    constructor() {
        this.name = 'empty';
    }
    register(email) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Could have registered to newsletter:', email);
        });
    }
}
//# sourceMappingURL=email-empty.provider.js.map