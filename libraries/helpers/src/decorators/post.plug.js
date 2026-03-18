import 'reflect-metadata';
export function PostPlug(params) {
    return function (target, propertyKey, descriptor) {
        // Retrieve existing metadata or initialize an empty array
        const existingMetadata = Reflect.getMetadata('custom:internal_plug', target) || [];
        // Add the metadata information for this method
        existingMetadata.push(Object.assign({ methodName: propertyKey }, params));
        // Define metadata on the class prototype (so it can be retrieved from the class)
        Reflect.defineMetadata('custom:internal_plug', existingMetadata, target);
    };
}
//# sourceMappingURL=post.plug.js.map