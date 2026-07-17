import 'reflect-metadata';

export function Webhook(params: {
  identifier: string;
  title: string;
  description: string;
  disabled?: boolean;
  // the permissions the integration must have for this automation to run
  scopes: string[];
  trigger: {
    title: string;
    description: string;
    placeholder: string;
  };
  actions: {
    type: string;
    title: string;
    description: string;
    placeholder: string;
    required: boolean;
  }[];
}) {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: any
  ) {
    // Retrieve existing metadata or initialize an empty array
    const existingMetadata =
      Reflect.getMetadata('custom:webhook', target) || [];

    // Add the metadata information for this method
    existingMetadata.push({ methodName: propertyKey, ...params });

    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata('custom:webhook', existingMetadata, target);
  };
}
