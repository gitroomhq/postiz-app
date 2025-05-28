'use client';

import {
  DetailedHTMLProps, FC, forwardRef, ReactNode, SelectHTMLAttributes, useCallback, useEffect, useMemo, useState
} from 'react';
import interClass from '../helpers/inter.font';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useDebouncedCallback } from 'use-debounce';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

type XCommunity = {
  id: string;
  name: string;
  member_count: number;
};

export const XCommunitiesSelect: FC<
  DetailedHTMLProps<
    SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  > & {
    error?: any;
    disableForm?: boolean;
    label: string;
    name: string;
    placeholder?: string;
    removeError?: boolean;
    className?: string;
  }
> = forwardRef((props, ref) => {
  const { onChange, placeholder, className, removeError, label, ...rest } =
    props;
  const form = useFormContext();
  const value = form.watch(props.name);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<XCommunity[]>([]);
  const func = useCustomProviderFunction();

  const selectedCommunity = useMemo(() => {
    if (value?.id && communities.length) {
      return (
        communities.find((community) => community.id === value.id) || {
          name: placeholder || 'Select a community',
        }
      );
    }

    return { name: value?.name || placeholder || 'Select a community' };
  }, [value, communities, placeholder]);

  const changeOpen = useCallback(() => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchValue('');
    }
  }, [isOpen]);

  const setOption = useCallback(
    (community: XCommunity | undefined) => (e: any) => {
      form.setValue(props.name, community);
      setIsOpen(false);
      e.stopPropagation();
    },
    [form, props.name]
  );

  const searchCommunities = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 2) return;

    setLoading(true);
    try {
      const data = await func.get('communities', {
        search: query,
      });

      setCommunities(data);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  }, 500);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchValue(query);
      searchCommunities(query);
    },
    [searchCommunities]
  );

  useEffect(() => {
    if (onChange) {
      onChange({
        // @ts-ignore
        target: {
          value: value as string,
        }
      });
    }
  }, [value, onChange]);

  return (
    <div className={clsx('flex flex-col gap-[6px] relative', className)}>
      {!!label && <div className={`${interClass} text-[14px]`}>{label}</div>}
      <div
        className={clsx(
          'bg-input h-[44px] border-fifth border rounded-[4px] text-inputText placeholder-inputText items-center justify-center flex'
        )}
        onClick={changeOpen}
      >
        <div className="flex-1 pl-[16px] text-[14px] select-none flex gap-[8px]">
          {selectedCommunity.name}
        </div>
        <div className="pr-[16px] flex gap-[8px]">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M13.354 6.35378L8.35403 11.3538C8.30759 11.4003 8.25245 11.4372 8.19175 11.4623C8.13105 11.4875 8.06599 11.5004 8.00028 11.5004C7.93457 11.5004 7.86951 11.4875 7.80881 11.4623C7.74811 11.4372 7.69296 11.4003 7.64653 11.3538L2.64653 6.35378C2.55271 6.25996 2.5 6.13272 2.5 6.00003C2.5 5.86735 2.55271 5.7401 2.64653 5.64628C2.74035 5.55246 2.8676 5.49976 3.00028 5.49976C3.13296 5.49976 3.26021 5.55246 3.35403 5.64628L8.00028 10.2932L12.6465 5.64628C12.693 5.59983 12.7481 5.56298 12.8088 5.53784C12.8695 5.5127 12.9346 5.49976 13.0003 5.49976C13.066 5.49976 13.131 5.5127 13.1917 5.53784C13.2524 5.56298 13.3076 5.59983 13.354 5.64628C13.4005 5.69274 13.4373 5.74789 13.4625 5.80859C13.4876 5.86928 13.5006 5.93434 13.5006 6.00003C13.5006 6.06573 13.4876 6.13079 13.4625 6.19148C13.4373 6.25218 13.4005 6.30733 13.354 6.35378Z"
                fill="#64748B"
              />
            </svg>
          </div>
          {!!value && (
            <div onClick={setOption(undefined)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M12.854 12.1463C12.9005 12.1927 12.9373 12.2479 12.9625 12.3086C12.9876 12.3693 13.0006 12.4343 13.0006 12.5C13.0006 12.5657 12.9876 12.6308 12.9625 12.6915C12.9373 12.7522 12.9005 12.8073 12.854 12.8538C12.8076 12.9002 12.7524 12.9371 12.6917 12.9622C12.631 12.9874 12.566 13.0003 12.5003 13.0003C12.4346 13.0003 12.3695 12.9874 12.3088 12.9622C12.2481 12.9371 12.193 12.9002 12.1465 12.8538L8.00028 8.70691L3.85403 12.8538C3.76021 12.9476 3.63296 13.0003 3.50028 13.0003C3.3676 13.0003 3.24035 12.9476 3.14653 12.8538C3.05271 12.76 3 12.6327 3 12.5C3 12.3674 3.05271 12.2401 3.14653 12.1463L7.2934 8.00003L3.14653 3.85378C3.05271 3.75996 3 3.63272 3 3.50003C3 3.36735 3.05271 3.2401 3.14653 3.14628C3.24035 3.05246 3.3676 2.99976 3.50028 2.99976C3.63296 2.99976 3.76021 3.05246 3.85403 3.14628L8.00028 7.29316L12.1465 3.14628C12.2403 3.05246 12.3676 2.99976 12.5003 2.99976C12.633 2.99976 12.7602 3.05246 12.854 3.14628C12.9478 3.2401 13.0006 3.36735 13.0006 3.50003C13.0006 3.63272 12.9478 3.75996 12.854 3.85378L8.70715 8.00003L12.854 12.1463Z"
                  fill="#64748B"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div
          className={clsx(
            label && !removeError && '',
            'z-[100] absolute w-full top-[100%] left-0 flex flex-col rounded-bl-[4px] rounded-br-[4px] bg-fifth gap-[1px] border-l border-r border-b border-fifth overflow-hidden'
          )}
        >
          <div className="px-[16px] py-[8px] bg-input w-full">
            <input
              className="w-full bg-transparent outline-none text-[14px]"
              placeholder="Search communities..."
              value={searchValue}
              onChange={handleSearchChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {loading ? (
            <div className="px-[16px] py-[8px] bg-input w-full text-[14px] text-center">
              Loading...
            </div>
          ) : communities.length > 0 ? (
            <div className="max-h-[240px] overflow-y-auto">
              {communities.map((community) => (
                <div
                  key={community.id}
                  onClick={setOption(community)}
                  className="px-[16px] py-[8px] bg-input w-full flex justify-between hover:bg-customColor3 select-none cursor-pointer"
                >
                  <div className="flex-1 text-[14px]">{community.name}</div>
                  {community.member_count > 0 && (
                    <div className="text-[12px] text-gray-400 flex items-center">
                      {community.member_count.toLocaleString()} members
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchValue.length >= 2 ? (
            <div className="px-[16px] py-[8px] bg-input w-full text-[14px] text-center">
              No communities found
            </div>
          ) : (
            <div className="px-[16px] py-[8px] bg-input w-full text-[14px] text-center">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
});
