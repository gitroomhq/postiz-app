import 'reflect-metadata';

export function Rules(description: string) {
  return function (target: any) {
    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata(
      'custom:rules:description',
      description,
      target
    );
  };
}
