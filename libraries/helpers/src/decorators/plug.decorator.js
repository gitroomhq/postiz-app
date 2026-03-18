import 'reflect-metadata';
export function Plug(params) {
    return function (target, propertyKey, descriptor) {
        // Retrieve existing metadata or initialize an empty array
        const existingMetadata = Reflect.getMetadata('custom:plug', target) || [];
        // Add the metadata information for this method
        existingMetadata.push(Object.assign({ methodName: propertyKey }, params));
        // Define metadata on the class prototype (so it can be retrieved from the class)
        Reflect.defineMetadata('custom:plug', existingMetadata, target);
    };
}
//# sourceMappingURL=plug.decorator.js.map