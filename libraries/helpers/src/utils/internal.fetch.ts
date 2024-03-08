import { customFetch } from './custom.fetch.func';
import { cookies } from 'next/headers';

export const internalFetch = (url: string, options: RequestInit = {}) =>
  customFetch(
    { baseUrl: process.env.BACKEND_INTERNAL_URL! },
    cookies()?.get('auth')?.value!,
    cookies()?.get('showorg')?.value!
  )(url, options);
