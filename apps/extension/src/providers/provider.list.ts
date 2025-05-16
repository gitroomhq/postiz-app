import { XProvider } from './list/x.provider';
import { ProviderInterface } from './provider.interface';
import { LinkedinProvider } from './list/linkedin.provider';
import { YoutubeProvider } from './list/youtube.provider';

export const ProviderList = [
  new XProvider(),
  new LinkedinProvider(),
  new YoutubeProvider(),
] satisfies ProviderInterface[] as ProviderInterface[];
