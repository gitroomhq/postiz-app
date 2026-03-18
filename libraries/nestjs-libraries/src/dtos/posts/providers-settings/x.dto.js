import { __decorate, __metadata } from "tslib";
import { IsIn, IsOptional, Matches } from 'class-validator';
export class XDto {
}
__decorate([
    IsOptional(),
    Matches(/^(https:\/\/x\.com\/i\/communities\/\d+)?$/, {
        message: 'Invalid X community URL. It should be in the format: https://x.com/i/communities/1493446837214187523',
    }),
    __metadata("design:type", String)
], XDto.prototype, "community", void 0);
__decorate([
    IsIn(['everyone', 'following', 'mentionedUsers', 'subscribers', 'verified']),
    __metadata("design:type", String)
], XDto.prototype, "who_can_reply_post", void 0);
//# sourceMappingURL=x.dto.js.map