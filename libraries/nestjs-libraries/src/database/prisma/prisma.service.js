import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
let PrismaService = class PrismaService extends PrismaClient {
    constructor() {
        super({
            log: [
                {
                    emit: 'event',
                    level: 'query',
                },
            ],
        });
    }
    onModuleInit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.$connect();
        });
    }
    onModuleDestroy() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.$disconnect();
        });
    }
};
PrismaService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], PrismaService);
export { PrismaService };
let PrismaRepository = class PrismaRepository {
    constructor(_prismaService) {
        this._prismaService = _prismaService;
        this.model = this._prismaService;
    }
};
PrismaRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], PrismaRepository);
export { PrismaRepository };
let PrismaTransaction = class PrismaTransaction {
    constructor(_prismaService) {
        this._prismaService = _prismaService;
        this.model = this._prismaService;
    }
};
PrismaTransaction = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], PrismaTransaction);
export { PrismaTransaction };
//# sourceMappingURL=prisma.service.js.map