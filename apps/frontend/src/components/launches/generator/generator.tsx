import React, { FC, useCallback, useMemo, useState } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter } from 'next/navigation';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@mantine/modals';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { GeneratorDto } from '@gitroom/nestjs-libraries/dtos/generator/generator.dto';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Textarea } from '@gitroom/react/form/textarea';
import { Checkbox } from '@gitroom/react/form/checkbox';
import clsx from 'clsx';
import {
  CalendarWeekProvider,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import { AddEditModal } from '@gitroom/frontend/components/launches/add.edit.model';
import dayjs from 'dayjs';
import { Select } from '@gitroom/react/form/select';

const FirstStep: FC = (props) => {
  const { integrations, reloadCalendarView } = useCalendar();
  const modal = useModals();
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const [showStep, setShowStep] = useState('');
  const resolver = useMemo(() => {
    return classValidatorResolver(GeneratorDto);
  }, []);

  const form = useForm({
    mode: 'all',
    resolver,
    values: {
      research: '',
      isPicture: false,
      format: 'one_short',
      tone: 'personal',
    },
  });

  const [research] = form.watch(['research']);

  const generateStep = useCallback(
    async (reader: ReadableStreamDefaultReader) => {
      const decoder = new TextDecoder('utf-8');

      let lastResponse = {} as any;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) return lastResponse.data.output;

        // Convert chunked binary data to string
        const chunkStr = decoder.decode(value, { stream: true });
        for (const chunk of chunkStr
          .split('\n')
          .filter((f) => f && f.indexOf('{') > -1)) {
          try {
            const data = JSON.parse(chunk);
            switch (data.name) {
              case 'agent':
                setShowStep('Agent starting');
                break;
              case 'research':
                setShowStep('Researching your content...');
                break;
              case 'find-category':
                setShowStep('Understanding the category...');
                break;
              case 'find-topic':
                setShowStep('Finding the topic...');
                break;
              case 'find-popular-posts':
                setShowStep('Finding popular posts to match with...');
                break;
              case 'generate-hook':
                setShowStep('Generating hook...');
                break;
              case 'generate-content':
                setShowStep('Generating content...');
                break;
              case 'generate-picture':
                setShowStep('Generating pictures...');
                break;
              case 'upload-pictures':
                setShowStep('Uploading pictures...');
                break;
              case 'post-time':
                setShowStep('Finding time to post...');
                break;
            }
            lastResponse = data;
          } catch (e) {
            /** don't do anything **/
          }
        }
      }
    },
    []
  );

  const onSubmit: SubmitHandler<{
    research: string;
  }> = useCallback(
    async (value) => {
      setLoading(true);
      const response = await fetch('/posts/generator', {
        method: 'POST',
        body: JSON.stringify(value),
      });

      if (!response.body) {
        return;
      }

      const reader = response.body.getReader();
      const load = await generateStep(reader);

      const messages = load.content.map((p: any, index: number) => {
        if (index === 0) {
          return {
            content: load.hook + '\n' + p.content,
            ...(p?.image?.path ? { image: [p.image] } : {}),
          };
        }

        return {
          content: p.content,
          ...(p?.image?.path ? { image: [p.image] } : {}),
        };
      });

      setShowStep('');

      modal.openModal({
        closeOnClickOutside: false,
        closeOnEscape: false,
        withCloseButton: false,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
        },
        children: (
          <AddEditModal
            allIntegrations={integrations.map((p) => ({ ...p }))}
            integrations={integrations.slice(0).map((p) => ({ ...p }))}
            mutate={reloadCalendarView}
            date={dayjs.utc(load.date).local()}
            reopenModal={() => ({})}
            onlyValues={messages}
          />
        ),
        size: '80%',
      });

      setLoading(false);
    },
    [integrations, reloadCalendarView]
  );

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={loading ? 'pointer-events-none select-none opacity-75' : ''}
    >
      <FormProvider {...form}>
        <div className="flex flex-col">
          <div className="pb-[10px] rounded-[4px]">
            <div className="flex">
              <div className="flex-1">
                {!showStep ? (
                  <div className="loading-shimmer pb-[10px]">&nbsp;</div>
                ) : (
                  <div
                    className="loading-shimmer pb-[10px]"
                    data-text={showStep}
                  >
                    {showStep}
                  </div>
                )}
                <Textarea
                  label="Write anything"
                  disabled={loading}
                  placeholder="You can write anything you want, and also add links, we will do the research for you..."
                  {...form.register('research')}
                />
                <Select label="Output format" {...form.register('format')}>
                  <option value="one_short">Short post</option>
                  <option value="one_long">Long post</option>
                  <option value="thread_short">
                    A thread with short posts
                  </option>
                  <option value="thread_long">A thread with long posts</option>
                </Select>
                <Select label="Output format" {...form.register('tone')}>
                  <option value="personal">
                    Personal voice ({'"'}I am happy to announce{'"'})
                  </option>
                  <option value="company">
                    Company voice ({'"'}We are happy to announce{'"'})
                  </option>
                </Select>
                <div
                  className={clsx('flex items-center', loading && 'opacity-50')}
                >
                  <Checkbox
                    disabled={loading}
                    {...form.register('isPicture')}
                    label="Add pictures?"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-[20px] flex justify-end">
          <Button
            type="submit"
            disabled={research.length < 10}
            loading={loading}
          >
            Generate
          </Button>
        </div>
      </FormProvider>
    </form>
  );
};
export const GeneratorPopup = () => {
  const modals = useModals();

  const closeAll = useCallback(() => {
    modals.closeAll();
  }, []);

  return (
    <div className="bg-sixth p-[32px] w-full max-w-[920px] mx-auto flex flex-col rounded-[4px] border border-customColor6 relative">
      <button
        onClick={closeAll}
        className="outline-none absolute right-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
      >
        <svg
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
        >
          <path
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          ></path>
        </svg>
      </button>
      <h1 className="text-[24px]">Generate Posts</h1>
      <FirstStep />
    </div>
  );
};
export const GeneratorComponent = () => {
  const user = useUser();
  const router = useRouter();
  const modal = useModals();
  const all = useCalendar();

  const generate = useCallback(async () => {
    if (!user?.tier?.ai) {
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
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      size: '100%',
      children: (
        <CalendarWeekProvider {...all}>
          <GeneratorPopup />
        </CalendarWeekProvider>
      ),
    });
  }, [user, all]);

  return (
    <button
      className="p-[8px] rounded-md bg-red-700 flex justify-center items-center gap-[5px] outline-none text-white"
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
      <div className="flex-1 text-left">Generate Posts</div>
    </button>
  );
};
