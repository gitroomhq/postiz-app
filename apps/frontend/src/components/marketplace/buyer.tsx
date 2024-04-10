'use client';

import { FC, useCallback, useRef, useState } from 'react';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import interClass from '@gitroom/react/helpers/inter.font';
import { Button } from '@gitroom/react/form/button';

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

export const Options: FC<{
  title: string;
  options: Array<{ key: string; value: string }>;
  query: string;
}> = (props) => {
  const { title, options, query } = props;
  const router = useRouter();
  const searchParams = (useSearchParams().get(query) || '')?.split(',') || [];

  const change = (value: string, state: boolean) => {
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
      <div className="h-[56px] text-[20px] font-[600] flex items-center px-[24px] bg-[#0F1524]">
        {title}
      </div>
      <div className="bg-[#0b0f1c] flex flex-col gap-[16px] px-[32px] py-[24px]">
        {options.map((option) => (
          <div key={option.key} className="flex items-center gap-[10px]">
            <LabelCheckbox
              value={option.key}
              label={option.value}
              checked={searchParams.indexOf(option.key) > -1}
              name={query}
              onChange={change}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export const Card = () => {
  return (
    <div className="min-h-[155px] bg-[#0B101B] p-[24px] flex">
      <div className="flex gap-[16px] flex-1">
        <div>
          <div className="h-[103px] w-[103px] bg-red-500/10 rounded-full relative">
            <img
              src="https://via.placeholder.com/103"
              className="rounded-full w-full h-full"
            />
            <div className="w-[80px] h-[28px] bg-[#8155DD] absolute bottom-0 left-[50%] -translate-x-[50%] rounded-[30px] flex gap-[4px] justify-center items-center">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M7.82348 9.80876C8.45164 9.28076 8.90221 8.57235 9.11409 7.77958C9.32597 6.98682 9.28891 6.14807 9.00792 5.37709C8.72694 4.60611 8.21563 3.9402 7.54334 3.46967C6.87106 2.99914 6.07032 2.74677 5.24973 2.74677C4.42914 2.74677 3.62841 2.99914 2.95612 3.46967C2.28383 3.9402 1.77253 4.60611 1.49154 5.37709C1.21056 6.14807 1.17349 6.98682 1.38537 7.77958C1.59725 8.57235 2.04782 9.28076 2.67598 9.80876C1.69509 10.2523 0.845054 10.9411 0.207856 11.8088C0.0901665 11.9691 0.0410049 12.1697 0.0711866 12.3663C0.101368 12.5629 0.208421 12.7395 0.368794 12.8572C0.529167 12.9749 0.729724 13.024 0.926344 12.9939C1.12296 12.9637 1.29954 12.8566 1.41723 12.6963C1.85832 12.0938 2.43521 11.6039 3.10109 11.2662C3.76697 10.9284 4.50309 10.7524 5.24973 10.7524C5.99637 10.7524 6.73249 10.9284 7.39837 11.2662C8.06426 11.6039 8.64114 12.0938 9.08223 12.6963C9.19992 12.8567 9.37653 12.9638 9.57321 12.9941C9.76989 13.0243 9.97053 12.9752 10.131 12.8575C10.2914 12.7398 10.3986 12.5632 10.4288 12.3665C10.459 12.1699 10.4099 11.9692 10.2922 11.8088C9.65465 10.9412 8.80445 10.2524 7.82348 9.80876ZM2.74973 6.75001C2.74973 6.25556 2.89635 5.77221 3.17106 5.36108C3.44576 4.94996 3.83621 4.62953 4.29302 4.44031C4.74984 4.25109 5.2525 4.20158 5.73746 4.29805C6.22241 4.39451 6.66787 4.63261 7.0175 4.98224C7.36713 5.33187 7.60523 5.77733 7.70169 6.26228C7.79816 6.74724 7.74865 7.2499 7.55943 7.70672C7.37021 8.16353 7.04978 8.55398 6.63866 8.82868C6.22753 9.10339 5.74418 9.25001 5.24973 9.25001C4.58669 9.25001 3.95081 8.98662 3.48196 8.51778C3.01312 8.04894 2.74973 7.41305 2.74973 6.75001ZM15.631 12.8544C15.5516 12.9127 15.4615 12.9549 15.3658 12.9784C15.2701 13.0019 15.1707 13.0063 15.0733 12.9914C14.9759 12.9765 14.8824 12.9425 14.7982 12.8914C14.7139 12.8404 14.6405 12.7732 14.5822 12.6938C14.1401 12.0925 13.5629 11.6034 12.8973 11.2658C12.2317 10.9282 11.4961 10.7515 10.7497 10.75C10.5508 10.75 10.3601 10.671 10.2194 10.5303C10.0787 10.3897 9.99973 10.1989 9.99973 10C9.99973 9.8011 10.0787 9.61033 10.2194 9.46968C10.3601 9.32903 10.5508 9.25001 10.7497 9.25001C11.1178 9.24958 11.4813 9.16786 11.8142 9.01071C12.147 8.85355 12.4411 8.62482 12.6753 8.34086C12.9096 8.05691 13.0782 7.72473 13.1692 7.36805C13.2602 7.01138 13.2713 6.63901 13.2017 6.27754C13.1322 5.91607 12.9837 5.57443 12.7668 5.277C12.5499 4.97958 12.27 4.73373 11.9471 4.557C11.6242 4.38027 11.2662 4.27702 10.8988 4.25464C10.5314 4.23225 10.1636 4.29128 9.82161 4.42751C9.73 4.46502 9.63188 4.48402 9.5329 4.48343C9.43392 4.48283 9.33603 4.46265 9.24488 4.42404C9.15374 4.38543 9.07114 4.32916 9.00184 4.25848C8.93255 4.18779 8.87793 4.10409 8.84114 4.0122C8.80435 3.9203 8.78612 3.82204 8.78749 3.72306C8.78885 3.62409 8.8098 3.52636 8.84912 3.43552C8.88844 3.34468 8.94535 3.26252 9.01658 3.19378C9.0878 3.12504 9.17193 3.07108 9.26411 3.03501C10.1468 2.6816 11.1265 2.65418 12.0276 2.95767C12.9287 3.26115 13.6922 3.87569 14.1812 4.6911C14.6703 5.50652 14.8528 6.46947 14.6962 7.4073C14.5396 8.34512 14.0541 9.1965 13.3266 9.80876C14.3075 10.2523 15.1575 10.9411 15.7947 11.8088C15.9113 11.9693 15.9594 12.1694 15.9288 12.3654C15.8981 12.5613 15.791 12.7372 15.631 12.8544Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="text-[14px]">22,6K</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[8px]">
          <div className="flex gap-[14px] items-center">
            <div className="text-[24px]">Nevo David</div>
            <div className="flex gap-[3px]">
              <div
                className={clsx(
                  'bg-[#172034] rounded-[34px] py-[8px] px-[12px] text-[12px]',
                  interClass
                )}
              >
                Content Writer
              </div>
              <div
                className={clsx(
                  'bg-[#172034] rounded-[34px] py-[8px] px-[12px] text-[12px]',
                  interClass
                )}
              >
                Influencer
              </div>
            </div>
            <div className="flex gap-[10px]">
              <img
                src="/icons/platforms/devto.png"
                className="w-[24px] h-[24px] rounded-full"
              />
              <img
                src="/icons/platforms/hashnode.png"
                className="w-[24px] h-[24px] rounded-full"
              />
              <img
                src="/icons/platforms/linkedin.png"
                className="w-[24px] h-[24px] rounded-full"
              />
            </div>
          </div>
          <div className="text-[18px] text-[#AAA] font-[400]">
            Maecenas dignissim justo eget nulla rutrum molestie. Maecenas
            lobortis sem dui,
          </div>
          <div
            className={clsx(
              'gap-[8px] flex items-center text-[10px] font-[300] text-[#CEBDF2] tracking-[1.2px] uppercase',
              interClass
            )}
          >
            <div>AI</div>
            <div>
              <div className="w-[4px] h-[4px] bg-[#324264] rounded-full" />
            </div>
            <div>AI</div>
            <div>
              <div className="w-[4px] h-[4px] bg-[#324264] rounded-full" />
            </div>
            <div>AI</div>
          </div>
        </div>
      </div>
      <div className="ml-[100px] items-center flex">
        <Button>Request Service</Button>
      </div>
    </div>
  );
};

export const Buyer = () => {
  return (
    <div className="flex mt-[29px] w-full gap-[43px]">
      <div className="w-[330px]">
        <div className="flex flex-col gap-[16px]">
          <h2 className="text-[20px]">Filter</h2>
          <div className="flex flex-col">
            <Options
              options={[
                { key: 'asd', value: 'asdfasdf' },
                { key: 'asggggd', value: 'asdfassdfgsdfgdf' },
              ]}
              query="bla"
              title="hello"
            />
            <Options
              options={[
                { key: 'asd', value: 'asdfasdf' },
                { key: 'asggggd', value: 'asdfassdfgsdfgdf' },
              ]}
              query="blassss"
              title="sdfgsdgdsfg"
            />
          </div>
        </div>
      </div>
      <div className="flex-1 gap-[16px] flex-col flex">
        <div className="text-[20px] text-right">234 Result</div>
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
      </div>
    </div>
  );
};
