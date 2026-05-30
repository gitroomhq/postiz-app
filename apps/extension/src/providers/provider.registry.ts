import { CookieProvider } from './cookie-provider.interface';
import { skoolProvider } from './list/skool.provider';

export const providers: CookieProvider[] = [
  skoolProvider,
];

const providerMap = new Map<string, CookieProvider>(
  providers.map((p) => [p.identifier, p])
);

export function getAllProviders(): CookieProvider[] {
  return providers;
}

export function getProvider(identifier: string): CookieProvider | undefined {
  return providerMap.get(identifier);
}
