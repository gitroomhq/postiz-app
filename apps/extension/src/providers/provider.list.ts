import { XProvider } from './list/x.provider';
import { ProviderInterface } from './provider.interface';
import { LinkedinProvider } from './list/linkedin.provider';

export const ProviderList = [
  new XProvider(),
  new LinkedinProvider(),
] satisfies ProviderInterface[] as ProviderInterface[];
