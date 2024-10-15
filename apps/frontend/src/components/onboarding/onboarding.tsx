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

import { ReactComponent as CircleDashSvg } from '@gitroom/frontend/assets/circle-dash.svg';
import { ReactComponent as CircleOkSvg } from '@gitroom/frontend/assets/circle-ok.svg';
import { ReactComponent as CircleBlueSvg } from '@gitroom/frontend/assets/circle-b.svg';

export const Step: FC<{
  step: number;
  title: string;
  currentStep: number;
  lastStep: number;
}> = (props) => {
  const { step, title, currentStep, lastStep } = props;
  return (
    <div className="flex flex-col">
      <div className="mb-[8px]">
        <div className="w-[24px] h-[24px]">
          {step === currentStep && currentStep !== lastStep && (
            <CircleDashSvg />
          )}
          {(currentStep > step || currentStep == lastStep) && <CircleOkSvg />}
          {step > currentStep && currentStep !== lastStep && <CircleBlueSvg />}
        </div>
      </div>
      <div className="mb-[4px] text-[10px] text-customColor18 tracking-[1.2px]">
        STEP {step}
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
      Skip onboarding
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
      <h1 className="text-[24px]">Onboarding</h1>
      <div className="flex">
        <Step title="Profile" step={1} currentStep={step} lastStep={lastStep} />
        <StepSpace />
        {!isGeneral && (
          <>
            <Step
              title="Connect Github"
              step={2}
              currentStep={step}
              lastStep={4}
            />
            <StepSpace />
          </>
        )}
        <Step
          title="Connect Channels"
          step={3 - (isGeneral ? 1 : 0)}
          currentStep={step}
          lastStep={4}
        />
        <StepSpace />
        <Step
          title="Finish"
          step={4 - (isGeneral ? 1 : 0)}
          currentStep={step}
          lastStep={lastStep}
        />
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
      {step === 1 && (
        <>
          <div>
            <SettingsPopup getRef={ref} />
          </div>
          <div className="flex justify-end gap-[8px]">
            <SkipOnboarding />
            <Button onClick={firstNext}>Next</Button>
          </div>
        </>
      )}
      {step === 2 && !isGeneral && (
        <div>
          <GithubOnboarding />
          <div className="flex justify-end gap-[8px]">
            <SkipOnboarding />
            <Button onClick={nextStep()}>Next</Button>
          </div>
        </div>
      )}
      {step === 3 - (isGeneral ? 1 : 0) && (
        <div>
          <ConnectChannels />
          <div className="flex justify-end gap-[8px]">
            <SkipOnboarding />
            <Button onClick={nextStep()}>Next</Button>
          </div>
        </div>
      )}
      {step === 4 - (isGeneral ? 1 : 0) && (
        <div className="items-center justify-center flex flex-col gap-[24px]">
          <div className="items-center justify-center flex flex-col">
            <img src="/success.svg" alt="success" />
          </div>
          <div className="text-[18px] text-center">
            You are done, from here you can:
          </div>
          <div className="flex flex-col gap-[8px]">
            <div
              className={clsx(
                isGeneral ? 'grid' : 'grid grid-cols-2 gap-[8px]'
              )}
            >
              {!isGeneral && (
                <Button onClick={goToAnalytics}>View Analytics</Button>
              )}
              <Button onClick={goToLaunches}>Schedule a new post</Button>
            </div>

            <div className="grid grid-cols-2 gap-[8px]">
              <Button onClick={buyPosts}>Buy posts from Influencers</Button>
              <Button onClick={sellPosts}>Sell your services</Button>
            </div>
          </div>
        </div>
      )}
      {step === 5 - (isGeneral ? 1 : 0) && (
        <div>
          <div className="text-[24px] mb-[24px]">
            To sell posts you would have to:
          </div>
          <ul>
            <li>1. Connect at least one channel</li>
            <li>2. Connect you bank account</li>
          </ul>

          <div className="grid grid-cols-2 gap-[8px] mt-[24px]">
            <Button onClick={() => setStep(isGeneral ? 2 : 3)}>
              Go back to connect channels
            </Button>
            <Button onClick={connectBankAccount}>
              Move to the seller page to connect you bank
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
