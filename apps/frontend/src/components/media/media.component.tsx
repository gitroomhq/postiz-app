'use client';

import { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Media } from '@prisma/client';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import EventEmitter from 'events';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import clsx from 'clsx';
import interClass from '@gitroom/react/helpers/inter.font';
import { LoadingComponent } from '../layout/loading';

const showModalEmitter = new EventEmitter();

export const ShowMediaBoxModal: FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [callBack, setCallBack] =
    useState<(params: { id: string; path: string }) => void | undefined>();

  const closeModal = useCallback(() => {
    setShowModal(false);
    setCallBack(undefined);
  }, []);

  useEffect(() => {
    showModalEmitter.on('show-modal', (cCallback) => {
      setShowModal(true);
      setCallBack(() => cCallback);
    });
    return () => {
      showModalEmitter.removeAllListeners('show-modal');
    };
  }, []);
  if (!showModal) return null;

  return (
    <div className="text-white">
      <MediaBox setMedia={callBack!} closeModal={closeModal} />
    </div>
  );
};

export const showMediaBox = (
  callback: (params: { id: string; path: string }) => void
) => {
  showModalEmitter.emit('show-modal', callback);
};

export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }) => void;
  closeModal: () => void;
}> = (props) => {
  const { setMedia, closeModal } = props;
  const [pages, setPages] = useState(0);
  const [mediaList, setListMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();

  const loadMedia = useCallback(async () => {
    return (await fetch('/media')).json();
  }, []);

  const uploadMedia = useCallback(
    async (file: ChangeEvent<HTMLInputElement>) => {
      setLoading(() => true);
      const maxFileSize = 10 * 1024 * 1024;
      if (
        !file?.target?.files?.length ||
        file?.target?.files?.[0]?.size > maxFileSize
      ) {
        setLoading(() => false);
        return;
      }
      const formData = new FormData();
      formData.append('file', file?.target?.files?.[0]);
      const data = await (
        await fetch('/media', {
          method: 'POST',
          body: formData,
        })
      ).json();

      setListMedia([...mediaList, data]);
      setLoading(() => false);
    },
    [mediaList]
  );

  const setNewMedia = useCallback(
    (media: Media) => () => {
      setMedia(media);
      closeModal();
    },
    []
  );

  const { data, isLoading } = useSWR('get-media', loadMedia);

  useEffect(() => {
    setLoading(() => true);
    if (data?.pages) {
      setPages(data.pages);
    }
    if (data?.results && data?.results?.length) {
      setListMedia([...data.results]);
    }
    setLoading(() => false);
  }, [data]);

  return (
    <div className="fixed left-0 top-0 bg-black/80 z-[300] w-full h-full p-[60px] animate-fade">
      <div className="w-full h-full bg-[#0B101B] border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
        <div className="flex">
          <div className="flex-1">
            <TopTitle title="Media Library" />
          </div>
          <button
            onClick={closeModal}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-black hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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

          {!!mediaList.length && (
            <button
              className="flex absolute right-[40px] top-[7px] pointer hover:bg-third rounded-lg transition-all group px-2.5 py-2.5 text-sm font-semibold bg-transparent text-gray-800 hover:bg-gray-100 focus:text-primary-500"
              type="button"
            >
              <div className="relative flex gap-2 items-center justify-center">
                <input
                  type="file"
                  className="absolute left-0 top-0 w-full h-full opacity-0"
                  accept="image/*"
                  onChange={uploadMedia}
                />
                <button
                  className={`cursor-pointer font-[500] flex justify-center items-center gap-[4px] text-[12px] rounded-[4px] w-[107px] h-[25px] bg-[#0b0f1c] text-white ${interClass} border-[2px] border-[#506490]`}
                >
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="15"
                      viewBox="0 0 14 15"
                      fill="none"
                    >
                      <path
                        d="M7 1.8125C5.87512 1.8125 4.7755 2.14607 3.8402 2.77102C2.90489 3.39597 2.17591 4.28423 1.74544 5.32349C1.31496 6.36274 1.20233 7.50631 1.42179 8.60958C1.64124 9.71284 2.18292 10.7263 2.97833 11.5217C3.77374 12.3171 4.78716 12.8588 5.89043 13.0782C6.99369 13.2977 8.13726 13.185 9.17651 12.7546C10.2158 12.3241 11.104 11.5951 11.729 10.6598C12.3539 9.7245 12.6875 8.62488 12.6875 7.5C12.6859 5.99207 12.0862 4.54636 11.0199 3.48009C9.95365 2.41382 8.50793 1.81409 7 1.8125ZM7 12.3125C6.04818 12.3125 5.11773 12.0303 4.32632 11.5014C3.53491 10.9726 2.91808 10.221 2.55383 9.34166C2.18959 8.46229 2.09428 7.49466 2.27997 6.56113C2.46566 5.62759 2.92401 4.77009 3.59705 4.09705C4.27009 3.42401 5.1276 2.96566 6.06113 2.77997C6.99466 2.59428 7.9623 2.68958 8.84167 3.05383C9.72104 3.41808 10.4726 4.03491 11.0015 4.82632C11.5303 5.61773 11.8125 6.54818 11.8125 7.5C11.8111 8.77591 11.3036 9.99915 10.4014 10.9014C9.49915 11.8036 8.27591 12.3111 7 12.3125ZM9.625 7.5C9.625 7.61603 9.57891 7.72731 9.49686 7.80936C9.41481 7.89141 9.30353 7.9375 9.1875 7.9375H7.4375V9.6875C7.4375 9.80353 7.39141 9.91481 7.30936 9.99686C7.22731 10.0789 7.11603 10.125 7 10.125C6.88397 10.125 6.77269 10.0789 6.69064 9.99686C6.6086 9.91481 6.5625 9.80353 6.5625 9.6875V7.9375H4.8125C4.69647 7.9375 4.58519 7.89141 4.50314 7.80936C4.4211 7.72731 4.375 7.61603 4.375 7.5C4.375 7.38397 4.4211 7.27269 4.50314 7.19064C4.58519 7.10859 4.69647 7.0625 4.8125 7.0625H6.5625V5.3125C6.5625 5.19647 6.6086 5.08519 6.69064 5.00314C6.77269 4.92109 6.88397 4.875 7 4.875C7.11603 4.875 7.22731 4.92109 7.30936 5.00314C7.39141 5.08519 7.4375 5.19647 7.4375 5.3125V7.0625H9.1875C9.30353 7.0625 9.41481 7.10859 9.49686 7.19064C9.57891 7.27269 9.625 7.38397 9.625 7.5Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <div>Upload</div>
                </button>
              </div>
            </button>
          )}
        </div>
        <div
          className={clsx(
            'flex flex-wrap gap-[10px] mt-[35px] pt-[20px]',
            !mediaList.length && 'justify-center items-center text-white'
          )}
        >
          {loading || isLoading ? (
            <LoadingComponent />
          ) : (
            <>
              {!isLoading && !mediaList.length && (
                <div className="flex flex-col text-center">
                  <div>You don{"'"}t have any assets yet.</div>
                  <div>Click the button below to upload one</div>
                  <div className="mt-[10px]">
                    <div className="relative flex gap-2 items-center justify-center">
                      <input
                        type="file"
                        className="absolute left-0 top-0 w-full h-full opacity-0"
                        accept="image/*"
                        onChange={uploadMedia}
                      />
                      <button
                        className={`cursor-pointer font-[500] flex justify-center items-center gap-[4px] text-[12px] rounded-[4px] w-[107px] h-[25px] bg-[#0b0f1c] text-white ${interClass} border-[2px] border-[#506490]`}
                      >
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="15"
                            viewBox="0 0 14 15"
                            fill="none"
                          >
                            <path
                              d="M7 1.8125C5.87512 1.8125 4.7755 2.14607 3.8402 2.77102C2.90489 3.39597 2.17591 4.28423 1.74544 5.32349C1.31496 6.36274 1.20233 7.50631 1.42179 8.60958C1.64124 9.71284 2.18292 10.7263 2.97833 11.5217C3.77374 12.3171 4.78716 12.8588 5.89043 13.0782C6.99369 13.2977 8.13726 13.185 9.17651 12.7546C10.2158 12.3241 11.104 11.5951 11.729 10.6598C12.3539 9.7245 12.6875 8.62488 12.6875 7.5C12.6859 5.99207 12.0862 4.54636 11.0199 3.48009C9.95365 2.41382 8.50793 1.81409 7 1.8125ZM7 12.3125C6.04818 12.3125 5.11773 12.0303 4.32632 11.5014C3.53491 10.9726 2.91808 10.221 2.55383 9.34166C2.18959 8.46229 2.09428 7.49466 2.27997 6.56113C2.46566 5.62759 2.92401 4.77009 3.59705 4.09705C4.27009 3.42401 5.1276 2.96566 6.06113 2.77997C6.99466 2.59428 7.9623 2.68958 8.84167 3.05383C9.72104 3.41808 10.4726 4.03491 11.0015 4.82632C11.5303 5.61773 11.8125 6.54818 11.8125 7.5C11.8111 8.77591 11.3036 9.99915 10.4014 10.9014C9.49915 11.8036 8.27591 12.3111 7 12.3125ZM9.625 7.5C9.625 7.61603 9.57891 7.72731 9.49686 7.80936C9.41481 7.89141 9.30353 7.9375 9.1875 7.9375H7.4375V9.6875C7.4375 9.80353 7.39141 9.91481 7.30936 9.99686C7.22731 10.0789 7.11603 10.125 7 10.125C6.88397 10.125 6.77269 10.0789 6.69064 9.99686C6.6086 9.91481 6.5625 9.80353 6.5625 9.6875V7.9375H4.8125C4.69647 7.9375 4.58519 7.89141 4.50314 7.80936C4.4211 7.72731 4.375 7.61603 4.375 7.5C4.375 7.38397 4.4211 7.27269 4.50314 7.19064C4.58519 7.10859 4.69647 7.0625 4.8125 7.0625H6.5625V5.3125C6.5625 5.19647 6.6086 5.08519 6.69064 5.00314C6.77269 4.92109 6.88397 4.875 7 4.875C7.11603 4.875 7.22731 4.92109 7.30936 5.00314C7.39141 5.08519 7.4375 5.19647 7.4375 5.3125V7.0625H9.1875C9.30353 7.0625 9.41481 7.10859 9.49686 7.19064C9.57891 7.27269 9.625 7.38397 9.625 7.5Z"
                              fill="white"
                            />
                          </svg>
                        </div>
                        <div>Upload</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {mediaList.map((media) => (
                <div
                  key={media.id}
                  className="w-[200px] h-[200px] border-tableBorder border-2 cursor-pointer"
                  onClick={setNewMedia(media)}
                >
                  <img
                    className="w-full h-full object-cover"
                    src={mediaDirectory.set(media.path)}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const MultiMediaComponent: FC<{
  label: string;
  description: string;
  value?: Array<{ path: string; id: string }>;
  name: string;
  error?: any;
  onChange: (event: {
    target: { name: string; value?: Array<{ id: string; path: string }> };
  }) => void;
}> = (props) => {
  const { name, label, error, description, onChange, value } = props;
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, []);

  const [modal, setShowModal] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();

  const changeMedia = useCallback(
    (m: { path: string; id: string }) => {
      const newMedia = [...(currentMedia || []), m];
      setCurrentMedia(newMedia);
      onChange({ target: { name, value: newMedia } });
    },
    [currentMedia]
  );

  const showModal = useCallback(() => {
    setShowModal(!modal);
  }, [modal]);

  const clearMedia = useCallback(
    (topIndex: number) => () => {
      const newMedia = currentMedia?.filter((f, index) => index !== topIndex);
      setCurrentMedia(newMedia);
      onChange({ target: { name, value: newMedia } });
    },
    [currentMedia]
  );

  return (
    <>
      <div className="flex flex-col gap-[8px] bg-[#131B2C] rounded-bl-[8px]">
        {modal && <MediaBox setMedia={changeMedia} closeModal={showModal} />}
        <div className="flex gap-[10px]">
          <div className="flex">
            <Button
              onClick={showModal}
              className="ml-[10px] rounded-[4px] mb-[10px] gap-[8px] justify-center items-center w-[127px] flex border border-dashed border-[#506490] bg-[#131B2C]"
            >
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M19.5 3H7.5C7.10218 3 6.72064 3.15804 6.43934 3.43934C6.15804 3.72064 6 4.10218 6 4.5V6H4.5C4.10218 6 3.72064 6.15804 3.43934 6.43934C3.15804 6.72064 3 7.10218 3 7.5V19.5C3 19.8978 3.15804 20.2794 3.43934 20.5607C3.72064 20.842 4.10218 21 4.5 21H16.5C16.8978 21 17.2794 20.842 17.5607 20.5607C17.842 20.2794 18 19.8978 18 19.5V18H19.5C19.8978 18 20.2794 17.842 20.5607 17.5607C20.842 17.2794 21 16.8978 21 16.5V4.5C21 4.10218 20.842 3.72064 20.5607 3.43934C20.2794 3.15804 19.8978 3 19.5 3ZM7.5 4.5H19.5V11.0044L17.9344 9.43875C17.6531 9.15766 17.2717 8.99976 16.8741 8.99976C16.4764 8.99976 16.095 9.15766 15.8137 9.43875L8.75344 16.5H7.5V4.5ZM16.5 19.5H4.5V7.5H6V16.5C6 16.8978 6.15804 17.2794 6.43934 17.5607C6.72064 17.842 7.10218 18 7.5 18H16.5V19.5ZM19.5 16.5H10.875L16.875 10.5L19.5 13.125V16.5ZM11.25 10.5C11.695 10.5 12.13 10.368 12.5 10.1208C12.87 9.87357 13.1584 9.52217 13.3287 9.11104C13.499 8.6999 13.5436 8.2475 13.4568 7.81105C13.37 7.37459 13.1557 6.97368 12.841 6.65901C12.5263 6.34434 12.1254 6.13005 11.689 6.04323C11.2525 5.95642 10.8001 6.00097 10.389 6.17127C9.97783 6.34157 9.62643 6.62996 9.37919 6.99997C9.13196 7.36998 9 7.80499 9 8.25C9 8.84674 9.23705 9.41903 9.65901 9.84099C10.081 10.2629 10.6533 10.5 11.25 10.5ZM11.25 7.5C11.3983 7.5 11.5433 7.54399 11.6667 7.6264C11.79 7.70881 11.8861 7.82594 11.9429 7.96299C11.9997 8.10003 12.0145 8.25083 11.9856 8.39632C11.9566 8.5418 11.8852 8.67544 11.7803 8.78033C11.6754 8.88522 11.5418 8.95665 11.3963 8.98559C11.2508 9.01453 11.1 8.99968 10.963 8.94291C10.8259 8.88614 10.7088 8.79001 10.6264 8.66668C10.544 8.54334 10.5 8.39834 10.5 8.25C10.5 8.05109 10.579 7.86032 10.7197 7.71967C10.8603 7.57902 11.0511 7.5 11.25 7.5Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="text-[12px] font-[500]">Insert Media</div>
            </Button>
          </div>

          {!!currentMedia &&
            currentMedia.map((media, index) => (
              <>
                <div className="cursor-pointer w-[40px] h-[40px] border-2 border-tableBorder relative">
                  <img
                    className="w-full h-full object-cover"
                    src={mediaDirectory.set(media.path)}
                    onClick={() => window.open(mediaDirectory.set(media.path))}
                  />
                  <div
                    onClick={clearMedia(index)}
                    className="rounded-full w-[15px] h-[15px] bg-red-800 text-white flex justify-center items-center absolute -right-[4px] -top-[4px]"
                  >
                    x
                  </div>
                </div>
              </>
            ))}
        </div>
      </div>
      <div className="text-[12px] text-red-400">{error}</div>
    </>
  );
};

export const MediaComponent: FC<{
  label: string;
  description: string;
  value?: { path: string; id: string };
  name: string;
  onChange: (event: {
    target: { name: string; value?: { id: string; path: string } };
  }) => void;
}> = (props) => {
  const { name, label, description, onChange, value } = props;
  const { getValues } = useSettings();
  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentMedia(settings);
    }
  }, []);
  const [modal, setShowModal] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();

  const changeMedia = useCallback((m: { path: string; id: string }) => {
    setCurrentMedia(m);
    onChange({ target: { name, value: m } });
  }, []);

  const showModal = useCallback(() => {
    setShowModal(!modal);
  }, [modal]);

  const clearMedia = useCallback(() => {
    setCurrentMedia(undefined);
    onChange({ target: { name, value: undefined } });
  }, [value]);

  return (
    <div className="flex flex-col gap-[8px]">
      {modal && <MediaBox setMedia={changeMedia} closeModal={showModal} />}
      <div className="text-[14px]">{label}</div>
      <div className="text-[12px]">{description}</div>
      {!!currentMedia && (
        <div className="my-[20px] cursor-pointer w-[200px] h-[200px] border-2 border-tableBorder">
          <img
            className="w-full h-full object-cover"
            src={mediaDirectory.set(currentMedia.path)}
            onClick={() => window.open(mediaDirectory.set(currentMedia.path))}
          />
        </div>
      )}
      <div className="flex">
        <Button onClick={showModal}>Select</Button>
        <Button secondary={true} onClick={clearMedia}>
          Clear
        </Button>
      </div>
    </div>
  );
};
