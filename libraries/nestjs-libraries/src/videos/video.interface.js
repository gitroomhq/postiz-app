import { __awaiter } from "tslib";
import { Injectable, ValidationPipe } from '@nestjs/common';
export class VideoAbstract {
    processAndValidate(customParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const validationPipe = new ValidationPipe({
                skipMissingProperties: false,
                transform: true,
                transformOptions: {
                    enableImplicitConversion: true,
                },
            });
            yield validationPipe.transform(customParams, {
                type: 'body',
                metatype: this.dto,
            });
        });
    }
}
export function ExposeVideoFunction(description) {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata('video-function', description || 'true', descriptor.value);
    };
}
export function Video(params) {
    return function (target) {
        // Apply @Injectable decorator to the target class
        Injectable()(target);
        // Retrieve existing metadata or initialize an empty array
        const existingMetadata = Reflect.getMetadata('video', VideoAbstract) || [];
        // Add the metadata information for this method
        existingMetadata.push(Object.assign({ target }, params));
        // Define metadata on the class prototype (so it can be retrieved from the class)
        Reflect.defineMetadata('video', existingMetadata, VideoAbstract);
    };
}
//# sourceMappingURL=video.interface.js.map