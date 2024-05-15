import React, {
  ChangeEventHandler,
  FC,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter } from 'next/navigation';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import {
  Step,
  StepSpace,
} from '@gitroom/frontend/components/onboarding/onboarding';
import { useModals } from '@mantine/modals';
import { Select } from '@gitroom/react/form/select';
import { Input } from '@gitroom/react/form/input';
import dayjs from 'dayjs';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { GeneratorDto } from '@gitroom/nestjs-libraries/dtos/generator/generator.dto';
import { Button } from '@gitroom/react/form/button';
import { PostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

const FirstStep: FC<{ nextStep: () => void }> = (props) => {
  const { nextStep } = props;
  const fetch = useFetch();

  const resolver = useMemo(() => {
    return classValidatorResolver(GeneratorDto);
  }, []);

  const form = useForm({
    mode: 'all',
    resolver,
    values: {
      date: dayjs().week() + '_' + dayjs().year(),
      url: '',
      post: undefined as undefined | string,
    },
  });

  const [url, post] = form.watch(['url', 'post']);

  const list = useMemo(() => {
    const currentDate = dayjs();
    const generateWeeks = [...new Array(52)].map((_, i) => {
      const week = currentDate.add(i, 'week');
      return {
        value: week.week() + '_' + week.year(),
        label: `Week #${week.week()} (${week
          .startOf('isoWeek')
          .format('YYYY-MM-DD')} - ${week
          .endOf('isoWeek')
          .format('YYYY-MM-DD')})`,
      };
    });

    return generateWeeks;
  }, []);

  const makeSelect = useCallback((post?: string) => {
    form.setValue('post', post?.split?.(':')[1]?.split(')')?.[0]);
  }, []);

  const onSubmit: SubmitHandler<{
    date: string;
    url: string;
    post: string | undefined;
  }> = useCallback(async (value) => {
    fetch('/posts/generator', {
      method: 'POST',
      body: JSON.stringify(value),
    });
    // nextStep();
  }, []);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormProvider {...form}>
        <div className="flex flex-col">
          <Select
            label="Select a week"
            name="date"
            extraForm={{
              setValueAs: (value) => {
                const [week, year] = value.split('_');
                return { week: +week, year: +year };
              },
            }}
          >
            {list.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <div className="p-[20px] border border-fifth rounded-[4px]">
            <div className="flex">
              <div className="flex-1">
                <Input label="URL" {...form.register('url')} />
              </div>
            </div>
            <div className="pb-[10px]">Or select from exising posts</div>
            <div className="p-[16px] bg-input border-fifth border rounded-[4px] min-h-[500px]">
              <PostSelector
                noModal={true}
                onClose={() => {}}
                onSelect={makeSelect}
                date={dayjs().add(1, 'year')}
              />
            </div>
          </div>
        </div>
        <div className="mt-[20px] flex justify-end">
          <Button type="submit" disabled={!!(url && post)}>
            {url && post ? "You can't have both URL and a POST" : 'Next'}
          </Button>
        </div>
      </FormProvider>
    </form>
  );
};
export const GeneratorPopup = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="bg-sixth p-[32px] w-full max-w-[920px] mx-auto flex flex-col gap-[24px] rounded-[4px] border border-[#172034] relative">
      <h1 className="text-[24px]">Generate Posts</h1>
      <div className="flex">
        <Step title="Generate posts" step={1} currentStep={step} lastStep={3} />
        <StepSpace />
        <Step title="Confirm posts" step={2} currentStep={step} lastStep={3} />
        <StepSpace />
        <Step title="Done" step={3} currentStep={step} lastStep={3} />
      </div>
      {step === 1 && <FirstStep nextStep={() => setStep(2)} />}
    </div>
  );
};
export const GeneratorComponent = () => {
  const user = useUser();
  const router = useRouter();
  const modal = useModals();

  const generate = useCallback(async () => {
    if (!user?.tier.ai) {
      if (
        await deleteDialog(
          'You need to upgrade to use this feature',
          'Move to billing',
          'Payment Required'
        )
      ) {
        router.push('/billing');
      }
      return;
    }

    modal.openModal({
      title: '',
      withCloseButton: false,
      closeOnEscape: false,
      classNames: {
        modal: 'bg-transparent text-white',
      },
      size: '100%',
      children: <GeneratorPopup />,
    });
  }, [user]);

  return (
    <button
      className="text-white p-[8px] rounded-md bg-red-700 flex justify-center items-center gap-[5px]"
      onClick={generate}
    >
      <svg
        width="25"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.0614 9.67972L16.4756 11.0939L17.8787 9.69083L16.4645 8.27662L15.0614 9.67972ZM16.4645 6.1553L20 9.69083L8.6863 21.0045L5.15076 17.469L16.4645 6.1553Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.364 5.06066L9.59619 6.82843L8.53553 5.76777L10.3033 4L11.364 5.06066ZM6.76778 6.82842L5 5.06067L6.06066 4L7.82843 5.76776L6.76778 6.82842ZM10.3033 10.364L8.53553 8.5962L9.59619 7.53554L11.364 9.3033L10.3033 10.364ZM7.82843 8.5962L6.06066 10.364L5 9.3033L6.76777 7.53554L7.82843 8.5962Z"
          fill="currentColor"
        />
      </svg>
      Generate Posts
    </button>
  );
};
