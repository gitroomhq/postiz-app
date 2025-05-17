import { cookies } from 'next/headers';
import { customFetch } from '@gitroom/helpers/utils/custom.fetch.func';

export const internalFetch = (url: string, options: RequestInit = {}) =>
  customFetch(
    { baseUrl: process.env.BACKEND_INTERNAL_URL! },
    cookies()?.get('auth')?.value!,
    cookies()?.get('showorg')?.value!
  )(url, options);
