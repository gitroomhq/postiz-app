import 'reflect-metadata';

export function PostPlug(params: {
  identifier: string;
  title: string;
  disabled?: boolean;
  description: string;
  pickIntegration: string[];
  fields: {
    name: string;
    description: string;
    type: string;
    placeholder: string;
    validation?: RegExp;
  }[];
}) {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: any
  ) {
    // Retrieve existing metadata or initialize an empty array
    const existingMetadata =
      Reflect.getMetadata('custom:internal_plug', target) || [];

    // Add the metadata information for this method
    existingMetadata.push({ methodName: propertyKey, ...params });

    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata('custom:internal_plug', existingMetadata, target);
  };
}
