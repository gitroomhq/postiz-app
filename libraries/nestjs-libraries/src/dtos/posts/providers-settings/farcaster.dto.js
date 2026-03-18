import { __decorate, __metadata } from "tslib";
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
export class FarcasterId {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], FarcasterId.prototype, "id", void 0);
export class FarcasterValue {
}
__decorate([
    ValidateNested(),
    Type(() => FarcasterId),
    __metadata("design:type", FarcasterId)
], FarcasterValue.prototype, "value", void 0);
export class FarcasterDto {
}
__decorate([
    ValidateNested({ each: true }),
    Type(() => FarcasterValue),
    __metadata("design:type", Array)
], FarcasterDto.prototype, "subreddit", void 0);
//# sourceMappingURL=farcaster.dto.js.map