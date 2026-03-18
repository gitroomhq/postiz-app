import { __awaiter, __decorate } from "tslib";
import { BadRequestException, Injectable, } from '@nestjs/common';
let CustomFileValidationPipe = class CustomFileValidationPipe {
    transform(value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!value) {
                throw 'No file provided.';
            }
            if (!value.mimetype) {
                return value;
            }
            // Set the maximum file size based on the MIME type
            const maxSize = this.getMaxSize(value.mimetype);
            const validation = (value.mimetype.startsWith('image/') ||
                value.mimetype.startsWith('video/mp4')) &&
                value.size <= maxSize;
            if (validation) {
                return value;
            }
            throw new BadRequestException(`File size exceeds the maximum allowed size of ${maxSize} bytes.`);
        });
    }
    getMaxSize(mimeType) {
        if (mimeType.startsWith('image/')) {
            return 10 * 1024 * 1024; // 10 MB
        }
        else if (mimeType.startsWith('video/')) {
            return 1024 * 1024 * 1024; // 1 GB
        }
        else {
            throw new BadRequestException('Unsupported file type.');
        }
    }
};
CustomFileValidationPipe = __decorate([
    Injectable()
], CustomFileValidationPipe);
export { CustomFileValidationPipe };
//# sourceMappingURL=custom.upload.validation.js.map