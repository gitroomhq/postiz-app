import { __decorate, __metadata } from "tslib";
import { IsIn, IsOptional } from 'class-validator';
export class TwitchDto {
}
__decorate([
    IsIn(['message', 'announcement']),
    IsOptional(),
    __metadata("design:type", String)
], TwitchDto.prototype, "messageType", void 0);
__decorate([
    IsIn(['primary', 'blue', 'green', 'orange', 'purple']),
    IsOptional(),
    __metadata("design:type", String)
], TwitchDto.prototype, "announcementColor", void 0);
//# sourceMappingURL=twitch.dto.js.map