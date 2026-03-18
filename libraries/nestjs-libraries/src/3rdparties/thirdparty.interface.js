import { Injectable } from '@nestjs/common';
export class ThirdPartyAbstract {
}
export function ThirdParty(params) {
    return function (target) {
        // Apply @Injectable decorator to the target class
        Injectable()(target);
        // Retrieve existing metadata or initialize an empty array
        const existingMetadata = Reflect.getMetadata('third:party', ThirdPartyAbstract) || [];
        // Add the metadata information for this method
        existingMetadata.push(Object.assign({ target }, params));
        // Define metadata on the class prototype (so it can be retrieved from the class)
        Reflect.defineMetadata('third:party', existingMetadata, ThirdPartyAbstract);
    };
}
//# sourceMappingURL=thirdparty.interface.js.map