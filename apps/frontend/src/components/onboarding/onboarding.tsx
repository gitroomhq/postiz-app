'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModals } from '@mantine/modals';
import clsx from 'clsx';
import { GithubOnboarding } from '@gitroom/frontend/components/onboarding/github.onboarding';
import { SettingsPopup } from '@gitroom/frontend/components/layout/settings.component';
import { Button } from '@gitroom/react/form/button';
import { ConnectChannels } from '@gitroom/frontend/components/onboarding/connect.channels';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const Step: FC<{
  step: number;
  title: string;
  currentStep: number;
  lastStep: number;
}> = (props) => {
  const t = useT();

  const { step, title, currentStep, lastStep } = props;
  return (
    <div className="flex flex-col">
      <div className="mb-[8px]">
        <div className="w-[24px] h-[24px]">
          {step === currentStep && currentStep !== lastStep && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M9.02439 3.47341C8.99956 3.378 8.99379 3.27862 9.00741 3.18097C9.02102 3.08333 9.05376 2.98932 9.10374 2.90433C9.15372 2.81935 9.21996 2.74505 9.29869 2.6857C9.37741 2.62634 9.46706 2.58309 9.56252 2.55841C11.1614 2.14606 12.8387 2.14606 14.4375 2.55841C14.6146 2.60375 14.769 2.71221 14.8718 2.8634C14.9746 3.01459 15.0185 3.19811 14.9955 3.37945C14.9725 3.5608 14.884 3.72749 14.7467 3.84821C14.6095 3.96892 14.4328 4.03533 14.25 4.03497C14.1867 4.03464 14.1238 4.02646 14.0625 4.0106C12.7097 3.66167 11.2904 3.66167 9.93752 4.0106C9.7452 4.06021 9.54107 4.03151 9.36988 3.93081C9.1987 3.8301 9.07445 3.66561 9.02439 3.47341ZM5.04283 5.16935C3.88656 6.34678 3.0479 7.79831 2.60533 9.3881C2.55224 9.5798 2.57749 9.78474 2.6755 9.95783C2.77352 10.1309 2.93628 10.258 3.12799 10.3111C3.31969 10.3642 3.52463 10.3389 3.69772 10.2409C3.87081 10.1429 3.99787 9.98011 4.05095 9.78841C4.42508 8.4427 5.13475 7.214 6.11345 6.21747C6.24147 6.07348 6.30915 5.88574 6.30248 5.69318C6.2958 5.50062 6.21528 5.31802 6.0776 5.18323C5.93992 5.04845 5.75565 4.97182 5.56299 4.96923C5.37034 4.96665 5.18408 5.03831 5.04283 5.16935ZM4.05095 14.2078C4.02461 14.1129 3.97982 14.0241 3.91916 13.9464C3.85849 13.8688 3.78313 13.8039 3.69738 13.7554C3.61163 13.707 3.51718 13.6758 3.4194 13.6638C3.32162 13.6519 3.22244 13.6593 3.12752 13.6856C3.0326 13.7119 2.94379 13.7567 2.86618 13.8174C2.78857 13.8781 2.72366 13.9534 2.67517 14.0392C2.62668 14.1249 2.59556 14.2194 2.58357 14.3172C2.57159 14.4149 2.57898 14.5141 2.60533 14.609C3.04816 16.1987 3.88679 17.6502 5.04283 18.8278C5.18232 18.9696 5.37244 19.0503 5.57138 19.0519C5.77031 19.0536 5.96176 18.9762 6.10361 18.8367C6.24546 18.6972 6.32609 18.5071 6.32776 18.3081C6.32943 18.1092 6.252 17.9178 6.11252 17.7759C5.13502 16.7797 4.42578 15.5522 4.05095 14.2078ZM14.0625 19.9893C12.7097 20.3386 11.2903 20.3386 9.93752 19.9893C9.84161 19.963 9.74142 19.956 9.64279 19.9688C9.54415 19.9815 9.44903 20.0137 9.36297 20.0636C9.27691 20.1134 9.20163 20.1799 9.1415 20.2591C9.08137 20.3384 9.0376 20.4288 9.01273 20.5251C8.98786 20.6214 8.9824 20.7216 8.99665 20.8201C9.01091 20.9185 9.04459 21.0131 9.09576 21.0984C9.14692 21.1837 9.21454 21.2579 9.29467 21.3169C9.3748 21.3758 9.46585 21.4181 9.56252 21.4415C11.1614 21.8539 12.8387 21.8539 14.4375 21.4415C14.6274 21.3894 14.7892 21.2646 14.8879 21.0942C14.9866 20.9238 15.0143 20.7215 14.9651 20.5308C14.9159 20.3401 14.7936 20.1765 14.6247 20.0752C14.4559 19.9739 14.2539 19.943 14.0625 19.9893ZM20.8735 13.6875C20.7785 13.6611 20.6792 13.6538 20.5814 13.6658C20.4836 13.6778 20.3891 13.709 20.3033 13.7576C20.2175 13.8062 20.1422 13.8712 20.0816 13.9489C20.021 14.0267 19.9762 14.1156 19.95 14.2106C19.5761 15.5561 18.8664 16.7846 17.8875 17.7806C17.8185 17.8509 17.764 17.9341 17.7272 18.0255C17.6903 18.1168 17.6718 18.2145 17.6727 18.313C17.6737 18.4115 17.694 18.5089 17.7325 18.5995C17.771 18.6902 17.8271 18.7724 17.8974 18.8414C17.9677 18.9104 18.0509 18.9649 18.1422 19.0017C18.2336 19.0386 18.3313 19.0571 18.4298 19.0562C18.5283 19.0552 18.6257 19.0349 18.7163 18.9964C18.807 18.9579 18.8891 18.9018 18.9581 18.8315C20.1146 17.6542 20.9533 16.2027 21.3956 14.6128C21.4223 14.5177 21.4299 14.4184 21.4181 14.3204C21.4062 14.2224 21.3752 14.1277 21.3267 14.0417C21.2781 13.9558 21.2131 13.8802 21.1354 13.8194C21.0576 13.7586 20.9686 13.7138 20.8735 13.6875ZM19.9491 9.7931C19.9754 9.88802 20.0202 9.97682 20.0809 10.0544C20.1415 10.132 20.2169 10.197 20.3027 10.2454C20.3884 10.2939 20.4829 10.3251 20.5806 10.337C20.6784 10.349 20.7776 10.3416 20.8725 10.3153C20.9674 10.2889 21.0562 10.2442 21.1339 10.1835C21.2115 10.1228 21.2764 10.0475 21.3249 9.96172C21.3734 9.87597 21.4045 9.78151 21.4165 9.68373C21.4284 9.58595 21.4211 9.48677 21.3947 9.39185C20.9523 7.80198 20.1136 6.3504 18.9572 5.1731C18.8881 5.10286 18.8059 5.04692 18.7152 5.00846C18.6245 4.97 18.5272 4.94978 18.4287 4.94895C18.3302 4.94812 18.2325 4.96671 18.1411 5.00364C18.0498 5.04057 17.9667 5.09512 17.8964 5.16419C17.8262 5.23326 17.7702 5.31548 17.7318 5.40617C17.6933 5.49686 17.6731 5.59424 17.6723 5.69274C17.6714 5.79124 17.69 5.88894 17.727 5.98026C17.7639 6.07158 17.8185 6.15474 17.8875 6.22497C18.8653 7.22055 19.5746 8.44788 19.9491 9.79216V9.7931Z"
                fill="#8155DD"
              />
            </svg>
          )}
          {(currentStep > step || currentStep == lastStep) && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 2.25C10.0716 2.25 8.18657 2.82183 6.58319 3.89317C4.97982 4.96451 3.73013 6.48726 2.99218 8.26884C2.25422 10.0504 2.06114 12.0108 2.43735 13.9021C2.81355 15.7934 3.74215 17.5307 5.10571 18.8943C6.46928 20.2579 8.20656 21.1865 10.0979 21.5627C11.9892 21.9389 13.9496 21.7458 15.7312 21.0078C17.5127 20.2699 19.0355 19.0202 20.1068 17.4168C21.1782 15.8134 21.75 13.9284 21.75 12C21.7473 9.41498 20.7192 6.93661 18.8913 5.10872C17.0634 3.28084 14.585 2.25273 12 2.25ZM16.2806 10.2806L11.0306 15.5306C10.961 15.6004 10.8783 15.6557 10.7872 15.6934C10.6962 15.7312 10.5986 15.7506 10.5 15.7506C10.4014 15.7506 10.3038 15.7312 10.2128 15.6934C10.1218 15.6557 10.039 15.6004 9.96938 15.5306L7.71938 13.2806C7.57865 13.1399 7.49959 12.949 7.49959 12.75C7.49959 12.551 7.57865 12.3601 7.71938 12.2194C7.86011 12.0786 8.05098 11.9996 8.25 11.9996C8.44903 11.9996 8.6399 12.0786 8.78063 12.2194L10.5 13.9397L15.2194 9.21937C15.2891 9.14969 15.3718 9.09442 15.4628 9.0567C15.5539 9.01899 15.6515 8.99958 15.75 8.99958C15.8486 8.99958 15.9461 9.01899 16.0372 9.0567C16.1282 9.09442 16.2109 9.14969 16.2806 9.21937C16.3503 9.28906 16.4056 9.37178 16.4433 9.46283C16.481 9.55387 16.5004 9.65145 16.5004 9.75C16.5004 9.84855 16.481 9.94613 16.4433 10.0372C16.4056 10.1282 16.3503 10.2109 16.2806 10.2806Z"
                fill="#8155DD"
              />
            </svg>
          )}
          {step > currentStep && currentStep !== lastStep && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 2.25C10.0716 2.25 8.18657 2.82183 6.58319 3.89317C4.97982 4.96451 3.73013 6.48726 2.99218 8.26884C2.25422 10.0504 2.06114 12.0108 2.43735 13.9021C2.81355 15.7934 3.74215 17.5307 5.10571 18.8943C6.46928 20.2579 8.20656 21.1865 10.0979 21.5627C11.9892 21.9389 13.9496 21.7458 15.7312 21.0078C17.5127 20.2699 19.0355 19.0202 20.1068 17.4168C21.1782 15.8134 21.75 13.9284 21.75 12C21.7473 9.41498 20.7192 6.93661 18.8913 5.10872C17.0634 3.28084 14.585 2.25273 12 2.25ZM12 20.25C10.3683 20.25 8.77326 19.7661 7.41655 18.8596C6.05984 17.9531 5.00242 16.6646 4.378 15.1571C3.75358 13.6496 3.5902 11.9908 3.90853 10.3905C4.22685 8.79016 5.01259 7.32015 6.16637 6.16637C7.32016 5.01259 8.79017 4.22685 10.3905 3.90852C11.9909 3.59019 13.6497 3.75357 15.1571 4.37799C16.6646 5.00242 17.9531 6.05984 18.8596 7.41655C19.7661 8.77325 20.25 10.3683 20.25 12C20.2475 14.1873 19.3775 16.2843 17.8309 17.8309C16.2843 19.3775 14.1873 20.2475 12 20.25Z"
                fill="#172034"
              />
            </svg>
          )}
        </div>
      </div>
      <div className="mb-[4px] text-[10px] text-customColor18 tracking-[1.2px]">
        {t('step', 'STEP')}
        {step}
      </div>
      <div
        className={clsx('text-[12px]', step > currentStep && 'text-inputText')}
      >
        {title}
      </div>
    </div>
  );
};
export const StepSpace: FC = () => {
  return (
    <div className="flex-1 justify-center items-center flex px-[20px]">
      <div className="h-[1px] w-full bg-white"></div>
    </div>
  );
};
const SkipOnboarding: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

  const onSkip = useCallback(() => {
    const keys = Array.from(searchParams.keys());
    const buildNewQuery = keys
      .reduce((all, current) => {
        if (current === 'onboarding') {
          return all;
        }
        const value = searchParams.get(current);
        all.push(`${current}=${value}`);
        return all;
      }, [] as string[])
      .join('&');
    router.push(`?${buildNewQuery}`);
  }, [searchParams]);
  return (
    <Button
      secondary={true}
      className="border-[2px] border-customColor21"
      onClick={onSkip}
    >
      {t('skip_onboarding', 'Skip onboarding')}
    </Button>
  );
};
const Welcome: FC = () => {
  const [seller, setSeller] = useState(false);
  const { isGeneral } = useVariables();
  const [lastStep, setLastStep] = useState(isGeneral ? 3 : 4);
  const [step, setStep] = useState(1);
  const ref = useRef();
  const router = useRouter();
  const t = useT();

  const nextStep = useCallback(
    (stepIt?: number) => () => {
      setStep(stepIt ? stepIt : step + 1);
    },
    [step]
  );
  const firstNext = useCallback(() => {
    // @ts-ignore
    ref?.current?.click();
    nextStep(2)();
  }, [nextStep]);
  const goToAnalytics = useCallback(() => {
    router.push('/analytics');
  }, []);
  const goToLaunches = useCallback(() => {
    router.push('/launches');
  }, []);
  const buyPosts = useCallback(() => {
    router.push('/marketplace/buyer');
  }, []);
  const sellPosts = useCallback(() => {
    nextStep()();
    setLastStep(isGeneral ? 4 : 5);
    setSeller(true);
  }, [step]);
  const connectBankAccount = useCallback(() => {
    router.push('/marketplace/seller');
  }, []);
  return (
    <div className="bg-sixth p-[32px] w-full max-w-[920px] mx-auto flex flex-col gap-[24px] rounded-[4px] border border-customColor6 relative">
      <h1 className="text-[24px]">{t('onboarding', 'Onboarding')}</h1>
      <div className="flex">
        <Step
          title="Connect Channels"
          step={1}
          currentStep={step}
          lastStep={lastStep}
        />
        <StepSpace />
        {!isGeneral && (
          <>
            <Step
              title="Connect Github"
              step={2}
              currentStep={step}
              lastStep={2}
            />
            <StepSpace />
          </>
        )}
        <Step
          title="Finish"
          step={3 - (isGeneral ? 1 : 0)}
          currentStep={step}
          lastStep={2}
        />
        {/*<StepSpace />*/}
        {/*<Step title="Finish" step={4 - (isGeneral ? 1 : 0)} currentStep={step} lastStep={lastStep} />*/}
        {seller && (
          <>
            <StepSpace />
            <Step
              title="Sell Posts"
              step={5 - (isGeneral ? 1 : 0)}
              currentStep={step}
              lastStep={lastStep}
            />
          </>
        )}
      </div>
      {step === 1 && !isGeneral && (
        <div>
          <GithubOnboarding />
          <div className="flex justify-end gap-[8px]">
            {/*<SkipOnboarding />*/}
            <Button onClick={nextStep()}>{t('next', 'Next')}</Button>
          </div>
        </div>
      )}
      {step === 2 - (isGeneral ? 1 : 0) && (
        <div>
          <ConnectChannels />
          <div className="flex justify-end gap-[8px]">
            {/*<SkipOnboarding />*/}
            <Button onClick={nextStep()}>{t('next', 'Next')}</Button>
          </div>
        </div>
      )}
      {step === 3 - (isGeneral ? 1 : 0) && (
        <div className="items-center justify-center flex flex-col gap-[24px]">
          <div className="items-center justify-center flex flex-col">
            <img src="/success.svg" alt="success" />
          </div>
          <div className="text-[18px] text-center">
            {t(
              'you_are_done_from_here_you_can',
              'You are done, from here you can:'
            )}
          </div>
          <div className="flex flex-col gap-[8px]">
            <div
              className={clsx(
                isGeneral ? 'grid' : 'grid grid-cols-2 gap-[8px]'
              )}
            >
              {!isGeneral && (
                <Button onClick={goToAnalytics}>
                  {t('view_analytics', 'View Analytics')}
                </Button>
              )}
              <Button onClick={goToLaunches}>
                {t('schedule_a_new_post', 'Schedule a new post')}
              </Button>
            </div>

            {/*<div className="grid grid-cols-2 gap-[8px]">*/}
            {/*  /!*<Button onClick={buyPosts}>Buy posts from Influencers</Button>*!/*/}
            {/*  /!*<Button onClick={sellPosts}>Sell your services</Button>*!/*/}
            {/*</div>*/}
          </div>
        </div>
      )}
      {step === 4 - (isGeneral ? 1 : 0) && (
        <div>
          <div className="text-[24px] mb-[24px]">
            {t(
              'to_sell_posts_you_would_have_to',
              'To sell posts you would have to:'
            )}
          </div>
          <ul>
            <li>
              {t(
                '1_connect_at_least_one_channel',
                '1. Connect at least one channel'
              )}
            </li>
            <li>
              {t('2_connect_you_bank_account', '2. Connect you bank account')}
            </li>
          </ul>

          <div className="grid grid-cols-2 gap-[8px] mt-[24px]">
            <Button onClick={() => setStep(isGeneral ? 2 : 3)}>
              {t('go_back_to_connect_channels', 'Go back to connect channels')}
            </Button>
            <Button onClick={connectBankAccount}>
              {t(
                'move_to_the_seller_page_to_connect_you_bank',
                'Move to the seller page to connect you bank'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
export const Onboarding: FC = () => {
  const query = useSearchParams();
  const modal = useModals();
  const modalOpen = useRef(false);
  useEffect(() => {
    const onboarding = query.get('onboarding');
    if (!onboarding) {
      modalOpen.current = false;
      modal.closeAll();
      return;
    }
    modalOpen.current = true;
    modal.openModal({
      title: '',
      withCloseButton: false,
      closeOnEscape: false,
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      size: '100%',
      children: <Welcome />,
    });
  }, [query]);
  return null;
};
