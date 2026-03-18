import { skoolProvider } from './list/skool.provider';
export const providers = [
    skoolProvider,
];
const providerMap = new Map(providers.map((p) => [p.identifier, p]));
export function getAllProviders() {
    return providers;
}
export function getProvider(identifier) {
    return providerMap.get(identifier);
}
//# sourceMappingURL=provider.registry.js.map