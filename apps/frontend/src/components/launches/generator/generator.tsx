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
import clsx from 'clsx';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as MagicSvg } from '@gitroom/frontend/assets/magic.svg';

const ThirdStep: FC<{ week: number; year: number }> = (props) => {
  const { week, year } = props;

  const gotToPosts = useCallback(() => {
    window.location.href = `/launches?week=${week}&year=${year}`;
  }, [week, year]);
  return (
    <div>
      <div className="text-[20px] mb-[20px] flex flex-col items-center justify-center text-center mt-[20px] gap-[20px]">
        <img src="/success.svg" alt="success" />
        Your posts have been scheduled as drafts.
        <br />
        <Button onClick={gotToPosts}>Click here to see them</Button>
      </div>
    </div>
  );
};

const SecondStep: FC<{
  posts: Array<Array<{ post: string }>>;
  url: string;
  postId?: string;
  nextStep: (params: { week: number; year: number }) => void;
}> = (props) => {
  const { posts, nextStep, url, postId } = props;
  const fetch = useFetch();
  const [selected, setSelected] = useState<Array<string>>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    values: {
      date: dayjs().week() + '_' + dayjs().year(),
    },
  });

  const addPost = useCallback(
    (index: string) => () => {
      if (selected.includes(index)) {
        setSelected(selected.filter((i) => i !== index));
        return;
      }
      setSelected([...selected, index]);
    },
    [selected]
  );

  const list = useMemo(() => {
    const currentDate = dayjs();
    return [...new Array(52)].map((_, i) => {
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
  }, []);

  const createPosts: SubmitHandler<{
    date: any;
  }> = useCallback(
    async (values) => {
      setLoading(true);
      await fetch('/posts/generator/draft', {
        method: 'POST',
        body: JSON.stringify({
          posts: posts
            .filter((_, index) => selected.includes(String(index)))
            .map((po) => ({ list: po })),
          url,
          postId: postId ? `(post:${postId})` : undefined,
          year: values.date.year,
          week: values.date.week,
        }),
      });
      setLoading(false);
      nextStep({
        week: values.date.week,
        year: values.date.year,
      });
    },
    [selected, postId, url]
  );

  return (
    <form onSubmit={form.handleSubmit(createPosts)}>
      <FormProvider {...form}>
        <div className={loading ? 'opacity-75' : ''}>
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
          <div className="text-[20px] mb-[20px]">
            Click on the posts you would like to schedule.
            <br />
            They will be saved as drafts and you can edit them later.
          </div>
          <div className="grid grid-cols-3 gap-[25px] select-none cursor-pointer">
            {posts.map((post, index) => (
              <div
                onClick={addPost(String(index))}
                className={clsx(
                  'flex flex-col h-[200px] border rounded-[4px] group hover:border-white relative',
                  selected.includes(String(index))
                    ? 'border-white'
                    : 'border-fifth'
                )}
                key={post[0].post}
              >
                {post.length > 1 && (
                  <div className="bg-forth absolute -left-[15px] -top-[15px] z-[100] p-[3px] rounded-[10px]">
                    a thread
                  </div>
                )}
                <div
                  className={clsx(
                    'flex-1 relative h-full w-full group-hover:bg-black',
                    selected.includes(String(index)) && 'bg-black'
                  )}
                >
                  <div className="absolute left-0 top-0 w-full h-full p-[16px]">
                    <div className="w-full h-full overflow-hidden text-ellipsis group-hover:bg-black resize-none outline-none">
                      {post[0].post.split('\n\n')[0]}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-[20px] flex justify-end">
            <Button type="submit" disabled={!selected.length} loading={loading}>
              Create posts
            </Button>
          </div>
        </div>
      </FormProvider>
    </form>
  );
};

const FirstStep: FC<{
  nextStep: (
    posts: Array<Array<{ post: string }>>,
    url: string,
    postId?: string
  ) => void;
}> = (props) => {
  const { nextStep } = props;
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const resolver = useMemo(() => {
    return classValidatorResolver(GeneratorDto);
  }, []);

  const form = useForm({
    mode: 'all',
    resolver,
    values: {
      url: '',
      post: undefined as undefined | string,
    },
  });

  const [url, post] = form.watch(['url', 'post']);

  const makeSelect = useCallback(
    (post?: string) => {
      form.setValue('post', post?.split?.(':')[1]?.split(')')?.[0]);

      if (!post && !url) {
        form.setError('url', {
          message: 'You need to select a post or a URL',
        });
        return;
      }

      if (post && url) {
        form.setError('url', {
          message: 'You can only have a URL or a post',
        });
        return;
      }

      form.setError('url', {
        message: '',
      });
    },
    [post, url]
  );

  const onSubmit: SubmitHandler<{
    url: string;
    post: string | undefined;
  }> = useCallback(async (value) => {
    setLoading(true);
    const data = await (
      await fetch('/posts/generator', {
        method: 'POST',
        body: JSON.stringify(value),
      })
    ).json();
    nextStep(data.list, value.url, value.post);
    setLoading(false);
  }, []);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={loading ? 'pointer-events-none select-none opacity-75' : ''}
    >
      <FormProvider {...form}>
        <div className="flex flex-col">
          <div className="p-[20px] border border-fifth rounded-[4px]">
            <div className="flex">
              <div className="flex-1">
                <Input label="URL" {...form.register('url')} />
              </div>
            </div>
            <div className="flex flex-col-reverse">
              <div className="p-[16px] bg-input border-fifth border rounded-[4px] min-h-[500px] empty:hidden">
                <PostSelector
                  noModal={true}
                  onClose={() => null}
                  onSelect={makeSelect}
                  date={dayjs().add(1, 'year')}
                  only="article"
                />
              </div>
              <div className="pb-[10px] existing-empty">
                Or select from exising posts
              </div>
            </div>
          </div>
        </div>
        <div className="mt-[20px] flex justify-end">
          <Button type="submit" disabled={!!(url && post)} loading={loading}>
            {url && post ? "You can't have both URL and a POST" : 'Next'}
          </Button>
        </div>
      </FormProvider>
    </form>
  );
};
export const GeneratorPopup = () => {
  const [step, setStep] = useState(1);
  const modals = useModals();
  const [posts, setPosts] = useState<
    | {
        posts: Array<Array<{ post: string }>>;
        url: string;
        postId?: string;
      }
    | undefined
  >(undefined);

  const [yearAndWeek, setYearAndWeek] = useState<{
    year: number;
    week: number;
  } | null>(null);

  const closeAll = useCallback(() => {
    modals.closeAll();
  }, []);

  return (
    <div className="bg-sixth p-[32px] w-full max-w-[920px] mx-auto flex flex-col gap-[24px] rounded-[4px] border border-customColor6 relative">
      <button
        onClick={closeAll}
        className="outline-none absolute right-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
      >
        <CloseXSvg />
      </button>
      <h1 className="text-[24px]">Generate Posts</h1>
      <div className="flex">
        <Step title="Generate posts" step={1} currentStep={step} lastStep={3} />
        <StepSpace />
        <Step title="Confirm posts" step={2} currentStep={step} lastStep={3} />
        <StepSpace />
        <Step title="Done" step={3} currentStep={step} lastStep={3} />
      </div>
      {step === 1 && (
        <FirstStep
          nextStep={(posts, url: string, postId?: string) => {
            setPosts({
              posts,
              url,
              postId,
            });
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <SecondStep
          {...posts!}
          nextStep={(e) => {
            setYearAndWeek(e);
            setStep(3);
          }}
        />
      )}
      {step === 3 && (
        <ThirdStep week={yearAndWeek?.week!} year={yearAndWeek?.year!} />
      )}
    </div>
  );
};
export const GeneratorComponent = () => {
  const user = useUser();
  const router = useRouter();
  const modal = useModals();

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
      children: <GeneratorPopup />,
    });
  }, [user]);

  return (
    <button
      className="text-textColor p-[8px] rounded-md bg-red-700 flex justify-center items-center gap-[5px] outline-none"
      onClick={generate}
    >
      <MagicSvg />
      Generate Posts
    </button>
  );
};
