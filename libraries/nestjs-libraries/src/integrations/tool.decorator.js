import 'reflect-metadata';
export function Tool(params) {
    return function (target, propertyKey) {
        // Retrieve existing metadata or initialize an empty array
        const existingMetadata = Reflect.getMetadata('custom:tool', target) || [];
        // Add the metadata information for this method
        existingMetadata.push(Object.assign({ methodName: propertyKey }, params));
        // Define metadata on the class prototype (so it can be retrieved from the class)
        Reflect.defineMetadata('custom:tool', existingMetadata, target);
    };
}
//# sourceMappingURL=tool.decorator.js.map