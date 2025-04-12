import { ZodRawShape } from 'zod';

export function McpTool (params: {toolName: string, zod?: ZodRawShape}) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const existingMetadata = Reflect.getMetadata('MCP_TOOL', target) || [];

    // Add the metadata information for this method
    existingMetadata.push({ data: params, func: propertyKey });

    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata('MCP_TOOL', existingMetadata, target);
  }
}

export function McpPrompt (params: {promptName: string, zod?: ZodRawShape}) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const existingMetadata = Reflect.getMetadata('MCP_PROMPT', target) || [];

    // Add the metadata information for this method
    existingMetadata.push({ data: params, func: propertyKey });

    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata('MCP_PROMPT', existingMetadata, target);
  }
}
