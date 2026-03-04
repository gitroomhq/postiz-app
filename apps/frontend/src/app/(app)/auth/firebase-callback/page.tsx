'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/';
}

export default function FirebaseCallbackPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const fetchData = useFetch();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing token. Please try logging in again.');
      return;
    }

    fetchData('/auth/firebase-sso', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Firebase SSO failed');
        }

        const authHeader =
          res.headers.get('auth') || res.headers.get('Auth');
        if (authHeader) {
          setCookie('auth', authHeader, 365);
        }

        window.location.href = '/launches';
      })
      .catch((e) => {
        setError(e?.message || 'Unable to sign in. Please try again.');
      });
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-red-500">{error}</p>
        <a href="/auth" className="underline text-primary">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LoadingComponent />
      <p className="text-sm text-gray-400">Signing you in...</p>
    </div>
  );
}
