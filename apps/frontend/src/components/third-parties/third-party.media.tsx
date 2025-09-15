'use client';

import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import React, {
  createContext,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import './providers/heygen.provider';
import { thirdPartyList } from '@gitroom/frontend/components/third-parties/third-party.wrapper';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';

const ThirdPartyContext = createContext({
  id: '',
  name: '',
  title: '',
  identifier: '',
  description: '',
  close: () => {},
  onChange: (data: any) => {},
  fields: [],
  data: [
    {
      content: '',
      id: '',
      image: [
        {
          id: '',
          path: '',
        },
      ],
    },
  ],
});
export const useThirdParty = () => React.useContext(ThirdPartyContext);
const EmptyComponent: FC = () => null;

export const ThirdPartyPopup: FC<{
  closeModal: () => void;
  thirdParties: any[];
  onChange: (data: any) => void;
  allData: {
    content: string;
    id?: string;
    image?: Array<{
      id: string;
      path: string;
    }>;
  }[];
}> = (props) => {
  const { closeModal, thirdParties, allData, onChange } = props;
  const [thirdParty, setThirdParty] = useState<any>(null);
  const refNew = useRef(null);

  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
  useEffect(() => {
    setActivateExitButton(false);
    return () => {
      setActivateExitButton(true);
    };
  }, []);

  const Component = useMemo(() => {
    if (!thirdParty) {
      return EmptyComponent;
    }

    return (
      thirdPartyList.find((p) => p.identifier === thirdParty.identifier)
        ?.Component || EmptyComponent
    );
  }, [thirdParty]);

  const close = useCallback(() => {
    setThirdParty(null);
    closeModal();
  }, [setThirdParty, closeModal]);

  useEffect(() => {
    refNew?.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className={clsx('flex flex-wrap flex-col gap-[10px] pt-[20px]')}>
      {!thirdParty && (
        <div className="grid grid-cols-4 gap-[10px] justify-items-center justify-center">
          {thirdParties.map((p: any) => (
            <div
              onClick={() => {
                setThirdParty(p);
              }}
              key={p.identifier}
              className="w-full h-full p-[20px] min-h-[100px] text-[14px] bg-third hover:bg-input transition-all text-textColor relative flex flex-col gap-[15px] cursor-pointer"
            >
              <div>
                <img
                  className="w-[32px] h-[32px]"
                  src={`/icons/third-party/${p.identifier}.png`}
                />
              </div>
              <div className="whitespace-pre-wrap text-left text-lg">
                {p.title}: {p.name}
              </div>
              <div className="whitespace-pre-wrap text-left">
                {p.description}
              </div>
              <div className="w-full flex">
                <Button className="w-full">Use</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {thirdParty && (
        <>
          <div>
            <div
              className="cursor-pointer float-left"
              onClick={() => setThirdParty(null)}
            >
              {'<'} Back
            </div>
          </div>
          <ThirdPartyContext.Provider
            value={{ ...thirdParty, data: allData, close, onChange }}
          >
            <Component />
          </ThirdPartyContext.Provider>
        </>
      )}
    </div>
  );
};

export const ThirdPartyMedia: FC<{
  onChange: (data: any) => void;
  allData: {
    content: string;
    id?: string;
    image?: Array<{
      id: string;
      path: string;
    }>;
  }[];
}> = (props) => {
  const { allData, onChange } = props;
  const t = useT();
  const fetch = useFetch();
  const modals = useModals();

  const thirdParties = useCallback(async () => {
    return (await (await fetch('/third-party')).json()).filter(
      (f: any) => f.position === 'media'
    );
  }, []);

  const { data, isLoading, mutate } = useSWR('third-party', thirdParties, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });

  if (isLoading || !data.length) {
    return null;
  }

  return (
    <>
      <div className="relative group">
        <Button
          className={clsx(
            'relative ms-[10px] !px-[10px] rounded-[4px] gap-[8px] !text-primary justify-center items-center flex border border-dashed border-newBgLineColor bg-newColColor'
          )}
          onClick={() => {
            modals.openModal({
              title: t('integrations', 'Integrations'),
              size: '80%',
              children: (close) => (
                <ThirdPartyPopup
                  thirdParties={data}
                  closeModal={close}
                  allData={allData}
                  onChange={onChange}
                />
              ),
            });
          }}
        >
          <div className={clsx('flex gap-[5px] items-center')}>
            <div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M29.7081 8.29257C29.6152 8.19959 29.5049 8.12583 29.3835 8.07551C29.2621 8.02518 29.132 7.99928 29.0006 7.99928C28.8691 7.99928 28.739 8.02518 28.6176 8.07551C28.4962 8.12583 28.3859 8.19959 28.2931 8.29257L24.0006 12.5863L19.4143 8.00007L23.7081 3.70757C23.8957 3.51993 24.0011 3.26543 24.0011 3.00007C24.0011 2.7347 23.8957 2.48021 23.7081 2.29257C23.5204 2.10493 23.2659 1.99951 23.0006 1.99951C22.7352 1.99951 22.4807 2.10493 22.2931 2.29257L18.0006 6.58632L14.7081 3.29257C14.5204 3.10493 14.2659 2.99951 14.0006 2.99951C13.7352 2.99951 13.4807 3.10493 13.2931 3.29257C13.1054 3.48021 13 3.7347 13 4.00007C13 4.26543 13.1054 4.51993 13.2931 4.70757L14.0868 5.50007L7.46181 12.1251C6.99749 12.5894 6.62917 13.1406 6.37788 13.7472C6.12659 14.3539 5.99725 15.0041 5.99725 15.6607C5.99725 16.3173 6.12659 16.9675 6.37788 17.5742C6.62917 18.1808 6.99749 18.732 7.46181 19.1963L9.42556 21.1601L3.29306 27.2926C3.20015 27.3855 3.12645 27.4958 3.07616 27.6172C3.02588 27.7386 3 27.8687 3 28.0001C3 28.1315 3.02588 28.2616 3.07616 28.383C3.12645 28.5044 3.20015 28.6147 3.29306 28.7076C3.4807 28.8952 3.73519 29.0006 4.00056 29.0006C4.13195 29.0006 4.26206 28.9747 4.38345 28.9245C4.50485 28.8742 4.61515 28.8005 4.70806 28.7076L10.8443 22.5713L12.8081 24.5351C13.2724 24.9994 13.8236 25.3677 14.4302 25.619C15.0368 25.8703 15.687 25.9996 16.3437 25.9996C17.0003 25.9996 17.6505 25.8703 18.2572 25.619C18.8638 25.3677 19.415 24.9994 19.8793 24.5351L26.5043 17.9101L27.2968 18.7038C27.3897 18.7967 27.5 18.8704 27.6214 18.9207C27.7428 18.971 27.8729 18.9969 28.0043 18.9969C28.1357 18.9969 28.2658 18.971 28.3872 18.9207C28.5086 18.8704 28.6189 18.7967 28.7118 18.7038C28.8047 18.6109 28.8784 18.5006 28.9287 18.3792C28.979 18.2578 29.0049 18.1277 29.0049 17.9963C29.0049 17.8649 28.979 17.7348 28.9287 17.6134C28.8784 17.492 28.8047 17.3817 28.7118 17.2888L25.4143 14.0001L29.7081 9.70757C29.801 9.6147 29.8748 9.50441 29.9251 9.38301C29.9754 9.26161 30.0013 9.13148 30.0013 9.00007C30.0013 8.86865 29.9754 8.73853 29.9251 8.61713C29.8748 8.49573 29.801 8.38544 29.7081 8.29257ZM18.4656 23.1251C18.187 23.4038 17.8562 23.6249 17.4921 23.7758C17.128 23.9267 16.7378 24.0043 16.3437 24.0043C15.9496 24.0043 15.5593 23.9267 15.1953 23.7758C14.8312 23.6249 14.5004 23.4038 14.2218 23.1251L8.87556 17.7788C8.59681 17.5002 8.3757 17.1694 8.22483 16.8054C8.07397 16.4413 7.99632 16.051 7.99632 15.6569C7.99632 15.2628 8.07397 14.8726 8.22483 14.5085C8.3757 14.1445 8.59681 13.8137 8.87556 13.5351L15.5006 6.91007L25.0868 16.5001L18.4656 23.1251Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="text-[12px] font-[500] !text-current">
              {t('integrations', 'Integrations')}
            </div>
          </div>
        </Button>
      </div>
    </>
  );
};
