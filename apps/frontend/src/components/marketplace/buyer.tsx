'use client';

import React, {
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import interClass from '@gitroom/react/helpers/inter.font';
import { Button } from '@gitroom/react/form/button';
import {
  allTagsOptions,
  tagsList,
} from '@gitroom/nestjs-libraries/database/prisma/marketplace/tags.list';
import { capitalize, chunk, fill } from 'lodash';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@mantine/modals';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Textarea } from '@gitroom/react/form/textarea';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { NewConversationDto } from '@gitroom/nestjs-libraries/dtos/marketplace/new.conversation.dto';
import { OrderList } from '@gitroom/frontend/components/marketplace/order.list';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as ArrowLeftSvg } from '@gitroom/frontend/assets/arrow-left.svg';
import { ReactComponent as ArrowRightSvg } from '@gitroom/frontend/assets/arrow-right.svg';
import { ReactComponent as GroupSvg } from '@gitroom/frontend/assets/group.svg';

export interface Root {
  list: List[];
  count: number;
}

export interface List {
  id: string;
  name: any;
  bio: string;
  audience: number;
  picture: {
    id: string;
    path: string;
  };
  organizations: Organization[];
  items: Item[];
}

export interface Organization {
  organization: Organization2;
}

export interface Organization2 {
  Integration: Integration[];
}

export interface Integration {
  providerIdentifier: string;
}

export interface Item {
  key: string;
}

export const LabelCheckbox: FC<{
  label: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string, status: boolean) => void;
}> = (props) => {
  const { label, name, value, checked, onChange } = props;
  const ref = useRef<any>(null);
  const [innerCheck, setInnerCheck] = useState(checked);

  const change = useCallback(() => {
    setInnerCheck(!innerCheck);
    onChange(value, !innerCheck);
  }, [innerCheck]);

  return (
    <div className="flex items-center gap-[10px] select-none">
      <Checkbox
        ref={ref}
        variant="hollow"
        name={name}
        checked={checked}
        onChange={change}
        disableForm={true}
      />
      <label
        onClick={() => ref.current.click()}
        className="text-[20px]"
        htmlFor={name}
      >
        {label}
      </label>
    </div>
  );
};

const Pagination: FC<{ results: number }> = (props) => {
  const { results } = props;
  const router = useRouter();
  const search = useSearchParams();
  const page = +(parseInt(search.get('page')!) || 1) - 1;
  const from = page * 8;
  const to = (page + 1) * 8;
  const pagesArray = useMemo(() => {
    return Array.from({ length: Math.ceil(results / 8) }, (_, i) => i + 1);
  }, [results]);

  const changePage = useCallback(
    (newPage: number) => () => {
      const params = new URLSearchParams(window.location.search);
      params.set('page', String(newPage));
      router.replace('?' + params.toString(), {
        scroll: true,
      });
    },
    [page]
  );

  if (results < 8) {
    return null;
  }
  return (
    <div className="flex items-center relative">
      <div className="absolute left-0">
        Showing {from + 1} to {to > results ? results : to} from {results}{' '}
        Results
      </div>
      <div className="flex mx-auto">
        {page > 0 && (
          <div>
            <ArrowLeftSvg onClick={changePage(page)} />
          </div>
        )}
        {pagesArray.map((p) => (
          <div
            key={p}
            onClick={changePage(p)}
            className={clsx(
              'w-[40px] h-[40px] flex justify-center items-center rounded-[8px] cursor-pointer',
              p === page + 1 ? 'bg-customColor4' : 'text-inputText'
            )}
          >
            {p}
          </div>
        ))}
        {page + 1 < pagesArray[pagesArray.length - 1] && (
          <ArrowRightSvg onClick={changePage(page + 2)} />
        )}
      </div>
    </div>
  );
};

export const Options: FC<{
  title: string;
  options: Array<{ key: string; value: string }>;
  onChange?: (key: string, value: boolean) => void;
  preSelected?: string[];
  rows?: number;
  search: boolean;
}> = (props) => {
  const { title, onChange, search, preSelected } = props;
  const query = 'services';
  const [selected, setPreSelected] = useState<string[]>(
    preSelected?.slice(0) || []
  );
  const rows = props.rows || 1;
  const optionsGroupList = chunk(
    props.options,
    Math.ceil(props.options.length / rows)
  );
  const optionsGroup =
    optionsGroupList.length < rows
      ? [
          ...optionsGroupList,
          ...fill(Array(rows - optionsGroupList.length), []),
        ]
      : optionsGroupList;
  const router = useRouter();
  const searchParams = (useSearchParams().get(query) || '')?.split(',') || [];

  const change = (value: string, state: boolean) => {
    if (onChange) {
      onChange(value, state);
    }
    if (!search) {
      return;
    }

    const getAll = new URLSearchParams(window.location.search).get(query);
    const splitAll = (getAll?.split(',') || []).filter((f) => f);

    if (state) {
      splitAll?.push(value);
    } else {
      splitAll?.splice(splitAll.indexOf(value), 1);
    }

    const params = new URLSearchParams(window.location.search);
    if (!splitAll?.length) {
      params.delete(query);
    } else {
      params.set(query, splitAll?.join(',') || '');
    }

    router.replace('?' + params.toString());
    return params.toString();
  };

  return (
    <>
      <div className="h-[56px] text-[20px] font-[600] flex items-center px-[24px] bg-customColor8">
        {title}
      </div>
      <div className="bg-customColor3 flex px-[32px] py-[24px]">
        {optionsGroup.map((options, key) => (
          <div
            key={`options_` + key}
            className="flex gap-[16px] flex-col flex-1 justify-start"
          >
            {options.map((option) => (
              <div key={option.key} className="flex gap-[10px]">
                <LabelCheckbox
                  value={option.key}
                  label={option.value}
                  checked={
                    selected?.indexOf(option.key) > -1 ||
                    searchParams.indexOf(option.key) > -1
                  }
                  name={query}
                  onChange={change}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export const RequestService: FC<{ toId: string; name: string }> = (props) => {
  const { toId, name } = props;
  const router = useRouter();
  const fetch = useFetch();
  const modal = useModals();
  const resolver = useMemo(() => {
    return classValidatorResolver(NewConversationDto);
  }, []);

  const form = useForm({ resolver, values: { to: toId, message: '' } });
  const close = useCallback(() => {
    return modal.closeAll();
  }, []);

  const createConversation: SubmitHandler<NewConversationDto> = useCallback(
    async (data) => {
      const { id } = await (
        await fetch('/marketplace/conversation', {
          method: 'POST',
          body: JSON.stringify(data),
        })
      ).json();
      close();
      router.push(`/messages/${id}`);
    },
    []
  );

  return (
    <form onSubmit={form.handleSubmit(createConversation)}>
      <FormProvider {...form}>
        <div className="w-full max-w-[920px] mx-auto bg-sixth px-[16px] rounded-[4px] border border-customColor6 gap-[24px] flex flex-col relative">
          <button
            onClick={close}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
          >
            <CloseXSvg />
          </button>
          <div className="text-[18px] font-[500] flex flex-col">
            <TopTitle title={`Send a message to ${name}`} />
            <Textarea
              placeholder="Add a message like: I'm intrested in 3 posts for Linkedin... (min 50 chars)"
              className="mt-[14px] resize-none h-[400px]"
              name="message"
              label=""
            />
            <div className="flex justify-end">
              <Button
                disabled={!form.formState.isValid}
                type="submit"
                className="w-[144px] mb-[16px] rounded-[4px] text-[14px]"
              >
                Send Message
              </Button>
            </div>
          </div>
        </div>
      </FormProvider>
    </form>
  );
};

export const Card: FC<{
  data: List;
}> = (props) => {
  const { data } = props;
  const modal = useModals();

  const tags = useMemo(() => {
    return data.items
      .filter((f) => !['content-writer', 'influencers'].includes(f.key))
      .map((p) => {
        return allTagsOptions?.find((t) => t.key === p.key)?.value;
      });
  }, [data]);

  const requestService = useCallback(() => {
    modal.openModal({
      children: <RequestService toId={data.id} name={data.name || 'Noname'} />,
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      size: '100%',
    });
  }, []);

  const identifier = useMemo(() => {
    return [
      ...new Set(
        data.organizations.flatMap((p) =>
          p.organization.Integration.flatMap((d) => d.providerIdentifier)
        )
      ),
    ];
  }, []);

  return (
    <div className="min-h-[155px] bg-sixth p-[24px] flex">
      <div className="flex gap-[16px] flex-1">
        <div>
          <div className="h-[103px] w-[103px] bg-red-500/10 rounded-full relative">
            {data?.picture?.path && (
              <img
                src={data?.picture?.path}
                className="rounded-full w-full h-full"
              />
            )}
            <div className="w-[80px] h-[28px] bg-customColor4 absolute bottom-0 left-[50%] -translate-x-[50%] rounded-[30px] flex gap-[4px] justify-center items-center">
              <div>
                <GroupSvg />
              </div>
              <div className="text-[14px]">{data?.audience}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[8px]">
          <div className="flex gap-[14px] items-center">
            <div className="text-[24px]">{data.name || 'Noname'}</div>
            <div className="flex gap-[3px]">
              {data.items.some((i) => i.key === 'content-writer') && (
                <div
                  className={clsx(
                    'bg-customColor6 rounded-[34px] py-[8px] px-[12px] text-[12px]',
                    interClass
                  )}
                >
                  Content Writer
                </div>
              )}
              {data.items.some((i) => i.key === 'influencers') && (
                <div
                  className={clsx(
                    'bg-customColor6 rounded-[34px] py-[8px] px-[12px] text-[12px]',
                    interClass
                  )}
                >
                  Influencer
                </div>
              )}
            </div>
            <div className="flex gap-[10px]">
              {identifier.map((i) => (
                <img
                  key={i}
                  src={`/icons/platforms/${i}.png`}
                  className="w-[24px] h-[24px] rounded-full"
                />
              ))}
            </div>
          </div>
          <div className="text-[18px] text-customColor18 font-[400]">
            {data.bio || 'No bio'}
          </div>
          <div
            className={clsx(
              'gap-[8px] flex items-center text-[10px] font-[300] text-customColor41 tracking-[1.2px] uppercase',
              interClass
            )}
          >
            {tags.map((tag, index) => (
              <Fragment key={tag}>
                <div>{tag}</div>
                {index !== tags.length - 1 && (
                  <div>
                    <div className="w-[4px] h-[4px] bg-customColor1 rounded-full" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-[100px] items-center flex">
        <Button onClick={requestService}>Request Service</Button>
      </div>
    </div>
  );
};

export const Buyer = () => {
  const search = useSearchParams();
  const services = search.get('services');
  const page = +(search.get('page') || 1);
  const router = useRouter();

  const fetch = useFetch();

  const marketplace = useCallback(async () => {
    return await (
      await fetch('/marketplace', {
        method: 'POST',
        body: JSON.stringify({
          items: services?.split(',').filter((f) => f) || [],
          page: page === 0 ? 1 : page,
        }),
      })
    ).json();
  }, [services, page]);

  useEffect(() => {
    if (!services) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('page', '1');
    router.replace('?' + params.toString());
  }, [services]);

  const { data: list } = useSWR<Root>('search' + services + page, marketplace);

  return (
    <div className="flex flex-col items-center mt-[100px] gap-[27px] text-center">
      <div>
        <img src="/peoplemarketplace.svg" />
      </div>
      <div className="text-[48px]">
        The marketplace is not opened yet
        <br />
        Check again soon!
      </div>
    </div>
  );

  return (
    <>
      <div>
        <OrderList type="buyer" />
      </div>
      <div className="flex mt-[29px] w-full gap-[43px]">
        <div className="w-[330px]">
          <div className="flex flex-col gap-[16px]">
            <h2 className="text-[20px]">Filter</h2>
            <div className="flex flex-col">
              {tagsList.map((tag) => (
                <Options
                  search={true}
                  key={tag.key}
                  options={tag.options}
                  title={tag.name}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 gap-[16px] flex-col flex">
          <div className="text-[20px] text-right">
            {list?.count || 0} Result
          </div>
          {list?.list?.map((item, index) => (
            <Card key={String(index)} data={item} />
          ))}
          {/*<Pagination results={list?.count || 0} />*/}
        </div>
      </div>
    </>
  );
};
