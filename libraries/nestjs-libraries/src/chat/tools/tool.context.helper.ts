/**
 * Helper para ler o contexto de runtime das ferramentas Mastra.
 *
 * Mastra v1.21+ mudou a assinatura de `execute(args)` (single-arg com
 * `{ context, runtimeContext }`) para `execute(input, context)` onde
 * `context` carrega `{ requestContext, mastra, agent, ... }`.
 *
 * Como o codigo deste projeto foi escrito para a API antiga, este
 * helper centraliza a leitura aceitando ambas as formas — assim a
 * migracao das ferramentas fica em uma unica linha sem ter que
 * memorizar o nome novo em cada arquivo.
 *
 * Uso recomendado nas ferramentas (Mastra v1.21+):
 *
 *     execute: async (input, ctx) => {
 *       const requestContext = readRequestContext(ctx);
 *       const org = JSON.parse(requestContext.get('organization') as string);
 *       const profileId = requestContext.get('profileId') as string | undefined;
 *       ...
 *     }
 */
export interface MinimalRequestContext {
  get(key: string): unknown;
}

const EMPTY_CONTEXT: MinimalRequestContext = {
  get: () => undefined,
};

export function readRequestContext(rawCtx: any): MinimalRequestContext {
  if (!rawCtx) return EMPTY_CONTEXT;
  // v1.21+ — segundo argumento de execute, com requestContext aninhado.
  if (rawCtx.requestContext && typeof rawCtx.requestContext.get === 'function') {
    return rawCtx.requestContext;
  }
  // API antiga — single-arg com runtimeContext.
  if (rawCtx.runtimeContext && typeof rawCtx.runtimeContext.get === 'function') {
    return rawCtx.runtimeContext;
  }
  // Caso raro: rawCtx ja e o proprio context (chamada direta ou teste).
  if (typeof rawCtx.get === 'function') {
    return rawCtx as MinimalRequestContext;
  }
  return EMPTY_CONTEXT;
}
