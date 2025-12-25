import { FC, useCallback, useMemo, useState } from 'react';
import { ReactTags } from 'react-tag-autocomplete';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Input } from '@gitroom/react/form/input';
import { ColorPicker } from '@gitroom/react/form/color.picker';
import { Button } from '@gitroom/react/form/button';
import { uniqBy } from 'lodash';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import clsx from 'clsx';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';

export const TagsComponent: FC<{
  name: string;
  label: string;
  initial: any[];
  onChange: (event: {
    target: {
      value: any[];
      name: string;
    };
  }) => void;
}> = (props) => {
  const fetch = useFetch();

  const loadTags = useCallback(async () => {
    return (await fetch('/posts/tags')).json();
  }, []);

  const { data, isLoading, mutate } = useSWR('load-tags', loadTags);

  if (isLoading) {
    return null;
  }

  return <TagsComponentInner {...props} allTags={data} mutate={mutate} />;
};

export const TagsComponentInner: FC<{
  name: string;
  label: string;
  initial: any[];
  allTags: any;
  mutate: () => Promise<any>;
  onChange: (event: {
    target: {
      value: any[];
      name: string;
    };
  }) => void;
}> = ({ initial, onChange, name, mutate, allTags: data }) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [tagValue, setTagValue] = useState<any[]>(
    (initial?.slice(0) || []).map((p: any) => {
      return data?.tags.find((a: any) => a.name === p.value) || p;
    })
  );
  const modals = useModals();

  const ref = useClickOutside(() => {
    if (!isOpen) {
      return;
    }
    setIsOpen(false);
  });

  const addTag = useCallback(async () => {
    const val: string | undefined = await new Promise((resolve) => {
      modals.openModal({
        title: 'Add new tag',
        children: (close) => (
          <ShowModal tag="" close={close} resolve={resolve} />
        ),
      });
    });

    const newValues = await mutate();

    if (!val) {
      return;
    }

    const newTag = newValues.tags.find((p: any) => p.name === val);
    if (newTag) {
      const modify = [...tagValue, newTag];
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    }
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(
        'border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none',
        isOpen ? 'border-[#612BD3]' : 'border-newTextColor/10'
      )}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-[16px] justify-center flex gap-[8px] items-center h-full select-none flex-1"
      >
        <div className="cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="19"
            viewBox="0 0 17 19"
            fill="none"
          >
            <path
              d="M15.75 8.25L9.42157 1.92157C8.98919 1.48919 8.773 1.273 8.52071 1.1184C8.29703 0.981328 8.05317 0.880317 7.79808 0.819075C7.51036 0.75 7.20462 0.75 6.59314 0.75L3.25 0.75M0.75 6.33333L0.75 7.97876C0.75 8.38641 0.75 8.59024 0.79605 8.78205C0.836878 8.95211 0.904218 9.11469 0.9956 9.26381C1.09867 9.432 1.2428 9.57613 1.53105 9.86438L8.03105 16.3644C8.69108 17.0244 9.02109 17.3544 9.40164 17.4781C9.73638 17.5868 10.097 17.5868 10.4317 17.4781C10.8122 17.3544 11.1423 17.0244 11.8023 16.3644L13.8644 14.3023C14.5244 13.6423 14.8544 13.3122 14.9781 12.9317C15.0868 12.597 15.0868 12.2364 14.9781 11.9016C14.8544 11.5211 14.5244 11.1911 13.8644 10.531L7.78105 4.44772C7.4928 4.15946 7.34867 4.01534 7.18048 3.91227C7.03135 3.82089 6.86878 3.75354 6.69872 3.71272C6.50691 3.66667 6.30308 3.66667 5.89543 3.66667H3.41667C2.48325 3.66667 2.01654 3.66667 1.66002 3.84832C1.34641 4.00811 1.09145 4.26308 0.931656 4.57668C0.75 4.9332 0.75 5.39991 0.75 6.33333Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="cursor-pointer flex gap-[4px]">
          {tagValue.length === 0 ? (
            'Add New Tag'
          ) : (
            <>
              <div
                className="h-full flex justify-center items-center px-[8px] rounded-[4px]"
                style={{ backgroundColor: tagValue[0].color }}
              >
                <span className="mix-blend-difference text-[#fff]">
                  {tagValue[0].name}
                </span>
              </div>
              {tagValue.length > 1 ? <span>+{tagValue.length - 1}</span> : null}
            </>
          )}
        </div>
        <div className="cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={isOpen ? 'rotate-180' : ''}
          >
            <path
              d="M7.4563 8L12.5437 8C12.9494 8 13.1526 8.56798 12.8657 8.90016L10.322 11.8456C10.1442 12.0515 9.85583 12.0515 9.67799 11.8456L7.13429 8.90016C6.84741 8.56798 7.05059 8 7.4563 8Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      {isOpen && (
        <div className="z-[300] absolute left-0 bottom-[100%] w-[240px] bg-newBgColorInner p-[12px] menu-shadow -translate-y-[10px] flex flex-col">
          {(data?.tags || []).map((p: any) => (
            <div
              onClick={() => {
                const exists = !!tagValue.find((a) => a.id === p.id);
                let modify = [];
                if (exists) {
                  modify = tagValue.filter((a) => a.id !== p.id);
                } else {
                  modify = [...tagValue, p];
                }
                setTagValue(modify);
                onChange({
                  target: {
                    value: modify.map((p: any) => ({
                      label: p.name,
                      value: p.name,
                    })),
                    name,
                  },
                });
              }}
              key={p.name}
              className="h-[40px] py-[8px] px-[20px] -mx-[12px] flex gap-[8px]"
            >
              <Check
                onChange={() => {}}
                value={!!tagValue.find((a) => a.id === p.id)}
              />
              <div
                className="h-full flex justify-center items-center px-[8px] rounded-[8px]"
                style={{ backgroundColor: p.color }}
              >
                <span className="mix-blend-difference text-[#fff]">
                  {p.name}
                </span>
              </div>
            </div>
          ))}
          <div
            onClick={addTag}
            className="cursor-pointer gap-[8px] flex w-full h-[34px] rounded-[8px] mt-[12px] px-[16px] justify-center items-center bg-[#612BD3] text-white"
          >
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8.00065 3.33301V12.6663M3.33398 7.99967H12.6673"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-[13px] font-[600]">Add New Tag</div>
          </div>
        </div>
      )}
    </div>
  );
};

const Check: FC<{ value: boolean; onChange: (value: boolean) => void }> = ({
  value,
  onChange,
}) => {
  return (
    <div
      onClick={() => onChange(!value)}
      className={clsx(
        'text-[10px] font-[500] text-center flex border border-btnSimple rounded-[6px] w-[20px] h-[20px] justify-center items-center',
        value && 'bg-[#612BD3]'
      )}
    >
      {value ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="8"
          viewBox="0 0 11 8"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.7071 0.292893C11.0976 0.683417 11.0976 1.31658 10.7071 1.70711L4.70711 7.70711C4.31658 8.09763 3.68342 8.09763 3.29289 7.70711L0.292893 4.70711C-0.0976311 4.31658 -0.0976311 3.68342 0.292893 3.29289C0.683417 2.90237 1.31658 2.90237 1.70711 3.29289L4 5.58579L9.29289 0.292893C9.68342 -0.0976311 10.3166 -0.0976311 10.7071 0.292893Z"
            fill="white"
          />
        </svg>
      ) : (
        ''
      )}
    </div>
  );
};
export const TagsComponentA: FC<{
  name: string;
  label: string;
  initial: any[];
  onChange: (event: {
    target: {
      value: any[];
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name, initial } = props;
  const fetch = useFetch();
  const [tagValue, setTagValue] = useState<any[]>(initial?.slice(0) || []);
  const [suggestions, setSuggestions] = useState<string>('');
  const [showModal, setShowModal] = useState<any>(false);
  const loadTags = useCallback(async () => {
    return (await fetch('/posts/tags')).json();
  }, []);
  const { isLoading, data, mutate } = useSWR<{
    tags: {
      name: string;
      color: string;
    }[];
  }>('tags', loadTags, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
  const onDelete = useCallback(
    (tagIndex: number) => {
      const modify = tagValue.filter((_, i) => i !== tagIndex);
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    },
    [tagValue]
  );
  const createNewTag = useCallback(
    async (newTag: any) => {
      const val = await new Promise((resolve) => {
        setShowModal({
          tag: newTag.value,
          resolve,
          close: () => setShowModal(false),
        });
      });
      setShowModal(false);
      mutate();
      return val;
    },
    [mutate]
  );
  const edit = useCallback(
    (tag: any) => async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      const val = await new Promise((resolve) => {
        setShowModal({
          tag: tag.name,
          color: tag.color,
          id: tag.id,
          resolve,
          close: () => setShowModal(false),
        });
      });
      setShowModal(false);
      mutate();
      const modify = tagValue.map((t) => {
        if (t.label === tag.name) {
          return {
            value: val,
            label: val,
          };
        }
        return t;
      });
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    },
    [tagValue, data]
  );
  const onAddition = useCallback(
    async (newTag: any) => {
      if (tagValue.length >= 3) {
        return;
      }
      const getTag = data?.tags?.find((f) => f.name === newTag.label)
        ? newTag.label
        : await createNewTag(newTag);
      const modify = [
        ...tagValue,
        {
          value: getTag,
          label: getTag,
        },
      ];
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    },
    [tagValue, data]
  );

  // useEffect(() => {
  //   const settings = getValues()[props.name];
  //   if (settings) {
  //     setTagValue(settings);
  //   }
  // }, []);

  const suggestionsArray = useMemo(() => {
    return uniqBy<{
      label: string;
      value: string;
    }>(
      [
        ...(data?.tags.map((p) => ({
          label: p.name,
          value: p.name,
        })) || []),
        ...tagValue,
        {
          label: suggestions,
          value: suggestions,
        },
      ].filter((f) => f.label),
      (o) => o.label
    );
  }, [suggestions, tagValue]);

  const t = useT();

  if (isLoading) {
    return null;
  }
  return (
    <>
      {showModal && <ShowModal {...showModal} />}
      <div className="flex-1 flex tags-top">
        <ReactTags
          placeholderText={t('add_a_tag', 'Add a tag')}
          suggestions={suggestionsArray}
          selected={tagValue}
          onAdd={onAddition}
          onInput={setSuggestions}
          onDelete={onDelete}
          renderTag={(tag) => {
            const findTag = data?.tags?.find((f) => f.name === tag.tag.label);
            const findIndex = tagValue.findIndex(
              (f) => f.label === tag.tag.label
            );
            return (
              <div
                className={`min-w-[50px] float-left ms-[4px] p-[3px] rounded-sm relative`}
                style={{
                  backgroundColor: findTag?.color,
                }}
              >
                <div
                  className="absolute -top-[5px] start-[10px] text-[12px] text-red-600 bg-white px-[3px] rounded-full"
                  onClick={edit(findTag)}
                >
                  {t('edit', 'Edit')}
                </div>
                <div
                  className="absolute -top-[5px] -start-[5px] text-[12px] text-red-600 bg-white px-[3px] rounded-full"
                  onClick={() => onDelete(findIndex)}
                >
                  X
                </div>
                <div className="text-white mix-blend-difference">
                  {tag.tag.label}
                </div>
              </div>
            );
          }}
        />
      </div>
    </>
  );
};
const ShowModal: FC<{
  tag: string;
  color?: string;
  id?: string;
  close: () => void;
  resolve: (value: string) => void;
}> = (props) => {
  const t = useT();

  const { close, tag, resolve, color: theColor, id } = props;
  const fetch = useFetch();
  const [color, setColor] = useState<string>(theColor || '#942828');
  const [tagName, setTagName] = useState<string>(tag);
  const save = useCallback(async () => {
    await fetch(id ? `/posts/tags/${id}` : '/posts/tags', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({
        name: tagName,
        color,
      }),
    });
    resolve(tagName);
    close();
  }, [tagName, color, id]);
  return (
    <div>
      <Input
        name="name"
        disableForm={true}
        label="Name"
        value={tagName}
        onChange={(e) => setTagName(e.target.value)}
      />
      <ColorPicker
        onChange={(e) => setColor(e.target.value)}
        label="Tag Color"
        name="color"
        value={color}
        enabled={true}
        canBeCancelled={false}
      />
      <Button onClick={save} className="mt-[16px]">
        {t('save', 'Save')}
      </Button>
    </div>
  );
};
