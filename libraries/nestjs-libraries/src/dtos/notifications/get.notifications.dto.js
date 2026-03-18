import { __decorate, __metadata } from "tslib";
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
export class GetNotificationsDto {
    constructor() {
        this.page = 0;
    }
}
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Transform(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], GetNotificationsDto.prototype, "page", void 0);
//# sourceMappingURL=get.notifications.dto.js.map