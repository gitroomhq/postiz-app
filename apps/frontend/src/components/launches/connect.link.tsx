'use client';

import { FC, ReactNode, useCallback, useState } from 'react';
import useSWR from 'swr';
import { HttpStatusCode } from 'axios';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PlatformIcon } from '@gitroom/frontend/components/ui/platform.icon.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';

interface ConnectLinkDetails {
  identifier: string;
  name: string;
  redirectTo?: string;
}

const useConnectLink = (token: string) => {
  const fetch = useFetch();
  const load = useCallback(async (): Promise<ConnectLinkDetails> => {
    const response = await fetch(`/integrations/public/connect/${token}`);
    if (!response.ok) {
      throw new Error('Connection link not found');
    }
    return response.json();
  }, [token]);
  return useSWR(`connect-link-${token}`, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });
};

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex flex-1 items-center justify-center text-white relative overflow-hidden">
    {/* Background gradient decoration */}
    <div className="absolute inset-0 opacity-30">
      <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-[#612BD3] rounded-full blur-[120px]" />
      <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] bg-[#FC69FF] rounded-full blur-[120px]" />
    </div>
    {children}
  </div>
);

const Row: FC<{ icon: ReactNode; children: ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="flex gap-[12px] items-start">
    <svg
      className="w-[20px] h-[20px] shrink-0 mt-[1px] text-[#FC69FF]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon}
    </svg>
    <div className="flex-1">{children}</div>
  </div>
);

export const ConnectLink: FC<{ token: string }> = ({ token }) => {
  const t = useT();
  const fetch = useFetch();
  const { data, error, isLoading, mutate } = useConnectLink(token);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedMessage, setFailedMessage] = useState('');

  const connect = useCallback(async () => {
    setSubmitting(true);
    setFailed(false);
    setFailedMessage('');
    try {
      const response = await fetch(`/integrations/public/connect/${token}`, {
        method: 'POST',
      });
      const { url, message } = await response.json();
      if (!response.ok || !url) {
        // a refused connection says why (e.g. the plan has no channels left)
        if (response.status === HttpStatusCode.BadRequest) {
          setFailedMessage(message);
        }
        throw new Error('Could not connect to the platform');
      }
      window.location.href = url;
    } catch {
      setFailed(true);
      setSubmitting(false);
      // an expired link shows the expired screen instead
      mutate();
    }
  }, [token]);

  if (isLoading) {
    return (
      <Wrapper>
        <div className="relative z-10 flex justify-center">
          <div className="w-[48px] h-[48px] border-[3px] border-[#612BD3] border-t-transparent rounded-full animate-spin" />
        </div>
      </Wrapper>
    );
  }

  if (error || !data) {
    return (
      <Wrapper>
        <div className="relative z-10 text-center px-[20px]">
          <div className="w-[80px] h-[80px] mx-auto mb-[24px] rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-[40px] h-[40px] text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-[28px] font-semibold mb-[12px]">
            {t('connect_link_expired', 'This link is no longer valid')}
          </div>
          <div className="text-[16px] text-[#9C9C9C] max-w-[400px]">
            {t(
              'connect_link_expired_description',
              'Connection links work for one hour. Ask whoever sent it to you for a new one.'
            )}
          </div>
        </div>
      </Wrapper>
    );
  }

  // i18next escapes interpolated values for HTML, React already does
  const values = {
    platform: data.name,
    site: data.redirectTo,
    interpolation: { escapeValue: false },
  };

  return (
    <Wrapper>
      <div className="relative z-10 w-full max-w-[500px] mx-auto px-[20px] py-[40px]">
        <div className="bg-[#1A1919] rounded-[16px] overflow-hidden flex flex-col">
          <div className="relative h-[140px] bg-[#141313] overflow-hidden flex items-center justify-center gap-[14px]">
            <div className="absolute -top-[70px] left-[5%] w-[260px] h-[200px] bg-[#612BD3] rounded-full blur-[60px] opacity-80" />
            <div className="absolute -bottom-[90px] right-0 w-[240px] h-[200px] bg-[#FC69FF] rounded-full blur-[70px] opacity-60" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:7px_7px]" />
            <div className="relative w-[72px] h-[72px] rounded-[18px] bg-[#0B0A0A] border-[2px] border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center">
              <img
                src="/postiz.svg"
                alt="Postiz"
                className="w-[40px] h-[44px]"
              />
            </div>
            <div className="relative w-[36px] h-[36px] rounded-[10px] bg-[#1A1919] border border-[#2A2929] flex items-center justify-center">
              <svg
                className="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 17H7a5 5 0 010-10h2" />
                <path d="M15 7h2a5 5 0 010 10h-2" />
                <path d="M8 12h8" />
              </svg>
            </div>
            <div className="relative w-[72px] h-[72px] rounded-[18px] bg-[#0B0A0A] border-[2px] border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center">
              <PlatformIcon
                identifier={data.identifier}
                size={44}
                iconClassName="w-[44px] h-[44px] rounded-[10px]"
                channel=""
              />
            </div>
          </div>

          <div className="p-[32px] flex flex-col gap-[24px]">
            <h1 className="text-[24px] leading-[32px] font-semibold text-center">
              {t(
                'connect_link_title',
                'Postiz wants to connect to your {{platform}}',
                values
              )}
            </h1>

            <div className="border border-[#2A2929] rounded-[12px] p-[16px] flex flex-col gap-[14px] text-[14px]">
              <Row
                icon={
                  <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
                }
              >
                {t(
                  'connect_link_trust',
                  'Only continue if you trust whoever sent you this link'
                )}
              </Row>
              <Row
                icon={<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />}
              >
                {t(
                  'connect_link_automate',
                  'Postiz will automate your {{platform}} account: it can schedule and publish posts on your behalf',
                  values
                )}
              </Row>
              <Row
                icon={
                  <>
                    <rect x="4" y="4" width="16" height="6" rx="1.5" />
                    <rect x="4" y="14" width="16" height="6" rx="1.5" />
                    <path d="M8 7h.01M8 17h.01" />
                  </>
                }
              >
                {t(
                  'connect_link_system',
                  'Everything goes through the Postiz system: your account is added to a Postiz workspace and managed from there'
                )}
              </Row>
              {!!data.redirectTo && (
                <Row
                  icon={
                    <>
                      <path d="M14 5h5v5" />
                      <path d="M19 5l-8 8" />
                      <path d="M11 6H6a1 1 0 00-1 1v11a1 1 0 001 1h11a1 1 0 001-1v-5" />
                    </>
                  }
                >
                  {t(
                    'connect_link_redirect',
                    'When you are done you will be sent to {{site}}, a website outside of Postiz',
                    values
                  )}
                </Row>
              )}
            </div>

            <div className="text-[12px] uppercase tracking-[0.5px] text-[#9C9C9C] text-center">
              {t(
                'connect_link_next',
                'You will be taken to {{platform}} to sign in and approve the access',
                values
              )}
            </div>

            <div className="flex flex-col gap-[12px]">
              <button
                onClick={connect}
                disabled={submitting}
                className="bg-[#612BD3] hover:bg-[#7B3FF2] disabled:opacity-50 text-white rounded-[8px] py-[12px] px-[16px] text-[14px] font-semibold transition-colors"
              >
                {submitting
                  ? t('connect_link_connecting', 'Connecting...')
                  : t(
                      'connect_link_continue',
                      'Continue to {{platform}}',
                      values
                    )}
              </button>
              {failed && (
                <div className="text-[14px] text-red-500 text-center">
                  {failedMessage ||
                    t(
                      'could_not_connect_to_platform',
                      'Could not connect to the platform'
                    )}
                </div>
              )}
              <div className="text-[12px] text-[#9C9C9C] text-center">
                {t(
                  'connect_link_close',
                  'Not what you expected? Close this page and nothing will be connected.'
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[20px] flex items-center justify-center gap-[8px] text-[14px] text-[#9C9C9C]">
          {t('connect_link_secured_by', 'Secured by')}
          <span className="text-white flex">
            <LogoTextComponent />
          </span>
        </div>
      </div>
    </Wrapper>
  );
};
