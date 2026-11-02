import 'reflect-metadata';

// Lets the dashboard run a provider method without making it a @Tool, which
// the public API and the AI agent can run too. Kept per method name so an
// override in a subclass stays callable.
export function DashboardFunction() {
  return function (target: any, propertyKey: string | symbol) {
    Reflect.defineMetadata(
      'custom:dashboard_function',
      true,
      target,
      propertyKey
    );
  };
}
