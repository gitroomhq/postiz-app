'use client';

import {
  ClipboardEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Media } from '@prisma/client';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import EventEmitter from 'events';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import clsx from 'clsx';
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { MultipartFileUploader } from '@gitroom/frontend/components/media/new.uploader';
import dynamic from 'next/dynamic';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AiImage } from '@gitroom/frontend/components/launches/ai.image';
import Image from 'next/image';
import { DropFiles } from '@gitroom/frontend/components/layout/drop.files';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ThirdPartyMedia } from '@gitroom/frontend/components/third-parties/third-party.media';
const Polonto = dynamic(
  () => import('@gitroom/frontend/components/launches/polonto')
);
const showModalEmitter = new EventEmitter();
export const Pagination: FC<{
  current: number;
  totalPages: number;
  setPage: (num: number) => void;
}> = (props) => {
  const t = useT();

  const { current, totalPages, setPage } = props;
  const totalPagesList = useMemo(() => {
    return Array.from(
      {
        length: totalPages,
      },
      (_, i) => i
    );
  }, [totalPages]);
  return (
    <ul className="flex flex-row items-center gap-1 justify-center mt-[15px]">
      <li className={clsx(current === 0 && 'opacity-20 pointer-events-none')}>
        <div
          className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 ps-2.5 text-gray-400 hover:text-white border-[#1F1F1F] hover:bg-forth"
          aria-label="Go to previous page"
          onClick={() => setPage(current - 1)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-chevron-left h-4 w-4"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{t('previous', 'Previous')}</span>
        </div>
      </li>
      {totalPagesList.map((page) => (
        <li key={page} className="">
          <div
            aria-current="page"
            onClick={() => setPage(page)}
            className={clsx(
              'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:bg-forth h-10 w-10 hover:text-white border-[#1F1F1F]',
              current === page
                ? 'bg-forth !text-white'
                : 'text-textColor hover:text-white'
            )}
          >
            {page + 1}
          </div>
        </li>
      ))}
      <li
        className={clsx(
          current + 1 === totalPages && 'opacity-20 pointer-events-none'
        )}
      >
        <a
          className="text-textColor hover:text-white group cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 pe-2.5 text-gray-400 border-[#1F1F1F] hover:bg-forth"
          aria-label="Go to next page"
          onClick={() => setPage(current + 1)}
        >
          <span>{t('next', 'Next')}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-chevron-right h-4 w-4"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </a>
      </li>
    </ul>
  );
};
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
    <div className="text-textColor">
      <MediaBox setMedia={callBack!} closeModal={closeModal} />
    </div>
  );
};
export const showMediaBox = (
  callback: (params: { id: string; path: string }) => void
) => {
  showModalEmitter.emit('show-modal', callback);
};
const CHUNK_SIZE = 1024 * 1024;
export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }) => void;
  type?: 'image' | 'video';
  closeModal: () => void;
}> = (props) => {
  const { setMedia, type, closeModal } = props;
  const [mediaList, setListMedia] = useState<Media[]>([]);
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
  const ref = useRef<any>(null);
  const loadMedia = useCallback(async () => {
    return (await fetch(`/media?page=${page + 1}`)).json();
  }, [page]);
  const setNewMedia = useCallback(
    (media: Media) => () => {
      setSelectedMedia(
        selectedMedia.find((p) => p.id === media.id)
          ? selectedMedia.filter((f) => f.id !== media.id)
          : [
              ...selectedMedia.map((p) => ({
                ...p,
              })),
              {
                ...media,
              },
            ]
      );
      // closeModal();
    },
    [selectedMedia]
  );
  const removeMedia = useCallback(
    (media: Media) => () => {
      setSelectedMedia(selectedMedia.filter((f) => f.id !== media.id));
      setListMedia(mediaList.filter((f) => f.id !== media.id));
    },
    [selectedMedia]
  );
  const addNewMedia = useCallback(
    (media: Media[]) => () => {
      setSelectedMedia((currentMedia) => [...currentMedia, ...media]);
      // closeModal();
    },
    [selectedMedia]
  );
  const addMedia = useCallback(async () => {
    // @ts-ignore
    setMedia(selectedMedia);
    closeModal();
  }, [selectedMedia]);
  const { data, mutate } = useSWR(`get-media-${page}`, loadMedia);
  const finishUpload = useCallback(async () => {
    const lastMedia = mediaList?.[0]?.id;
    const newData = await mutate();
    const untilLastMedia = newData.results.findIndex(
      (f: any) => f.id === lastMedia
    );
    const onlyNewMedia = newData.results.slice(
      0,
      untilLastMedia === -1 ? newData.results.length : untilLastMedia
    );
    addNewMedia(onlyNewMedia)();
  }, [mutate, addNewMedia, mediaList, selectedMedia]);
  const dragAndDrop = useCallback(
    async (event: ClipboardEvent<HTMLDivElement> | File[]) => {
      // @ts-ignore
      const clipboardItems = event.map((p) => ({
        kind: 'file',
        getAsFile: () => p,
      }));
      if (!clipboardItems) {
        return;
      }
      const files: File[] = [];

      // @ts-ignore
      for (const item of clipboardItems) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            if (isImage || isVideo) {
              files.push(file); // Collect images or videos
            }
          }
        }
      }
      if (files.length === 0) {
        return;
      }
      ref.current.setOptions({
        autoProceed: false,
      });
      for (const file of files) {
        ref.current.addFile(file);
        await ref.current.upload();
        ref.current.clear();
      }
      ref.current.setOptions({
        autoProceed: true,
      });
      finishUpload();
    },
    [mutate, addNewMedia, mediaList, selectedMedia]
  );
  const removeItem = useCallback(
    (media: Media) => async (e: any) => {
      e.stopPropagation();
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_the_image',
            'Are you sure you want to delete the image?'
          )
        ))
      ) {
        return;
      }
      await fetch(`/media/${media.id}`, {
        method: 'DELETE',
      });
      mutate();
    },
    [mutate]
  );
  useEffect(() => {
    if (data?.pages) {
      setPages(data.pages);
    }
    if (data?.results && data?.results?.length) {
      setListMedia([...data.results]);
    }
  }, [data]);

  const t = useT();

  return (
    <div className="removeEditor fixed start-0 top-0 bg-primary/80 z-[300] w-full min-h-full p-4 md:p-[60px] animate-fade">
      <div className="max-w-[1000px] w-full h-full bg-sixth border-tableBorder border-2 rounded-xl relative mx-auto">
        <DropFiles onDrop={dragAndDrop}>
          <div className="pb-[20px] px-[20px] w-full h-full">
            <div className="flex flex-col">
              <div className="flex-1">
                <TopTitle title="Media Library" />
              </div>
              <button
                onClick={closeModal}
                className="outline-none z-[300] absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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

              <div className="absolute flex justify-center mt-[55px] items-center pointer-events-none text-center h-[57px] w-full start-0 rounded-lg transition-all group text-sm font-semibold bg-transparent text-gray-800 hover:bg-gray-100 focus:text-primary-500">
                {t(
                  'select_or_upload_pictures_maximum_5_at_a_time',
                  'Select or upload pictures (maximum 5 at a time)'
                )}
                <br />
                {t(
                  'you_can_also_drag_drop_pictures',
                  'You can also drag & drop pictures'
                )}
              </div>

              {!!mediaList.length && (
                <>
                  <div className="flex absolute h-[57px] w-full start-0 top-0 rounded-lg transition-all group text-sm font-semibold bg-transparent text-gray-800 hover:bg-gray-100 focus:text-primary-500">
                    <div className="relative flex flex-1 pe-[45px] gap-2 items-center justify-center">
                      <div className="flex-1" />
                      <MultipartFileUploader
                        uppRef={ref}
                        onUploadSuccess={finishUpload}
                        allowedFileTypes={
                          type === 'video'
                            ? 'video/mp4'
                            : type === 'image'
                            ? 'image/*'
                            : 'image/*,video/mp4'
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div
              className={clsx(
                'flex flex-wrap gap-[10px] mt-[35px] pt-[20px]',
                !!mediaList.length &&
                  'justify-center items-center text-textColor'
              )}
            >
              {!mediaList.length ? (
                <div className="flex flex-col text-center items-center justify-center mx-auto">
                  <div>
                    {t(
                      'you_don_t_have_any_assets_yet',
                      "You don't have any assets yet."
                    )}
                  </div>
                  <div>
                    {t(
                      'click_the_button_below_to_upload_one',
                      'Click the button below to upload one'
                    )}
                  </div>
                  <div className="mt-[10px] justify-center items-center flex flex-col-reverse gap-[10px]">
                    <MultipartFileUploader
                      onUploadSuccess={finishUpload}
                      allowedFileTypes={
                        type === 'video'
                          ? 'video/mp4'
                          : type === 'image'
                          ? 'image/*'
                          : 'image/*,video/mp4'
                      }
                    />
                  </div>
                </div>
              ) : (
                <>
                  {selectedMedia.length > 0 && (
                    <div className="flex justify-center absolute top-[7px] text-white">
                      <Button onClick={addMedia} className="!text-white">
                        <span className="!text-white">
                          {t('add_selected_media', 'Add selected media')}
                        </span>
                      </Button>
                    </div>
                  )}
                </>
              )}
              {mediaList
                .filter((f) => {
                  if (type === 'video') {
                    return f.path.indexOf('mp4') > -1;
                  } else if (type === 'image') {
                    return f.path.indexOf('mp4') === -1;
                  }
                  return true;
                })
                .map((media) => (
                  <div
                    key={media.id}
                    className={clsx(
                      'w-[120px] h-[120px] flex select-none relative cursor-pointer',
                      selectedMedia.find((p) => p.id === media.id)
                        ? 'border-4 border-forth'
                        : 'border-tableBorder border-2'
                    )}
                    onClick={setNewMedia(media)}
                  >
                    <div
                      onClick={removeItem(media)}
                      className="border border-red-400 !text-white flex justify-center items-center absolute w-[20px] h-[20px] rounded-full bg-red-700 -top-[5px] -end-[5px]"
                    >
                      X
                    </div>

                    {media.path.indexOf('mp4') > -1 ? (
                      <VideoFrame url={mediaDirectory.set(media.path)} />
                    ) : (
                      <Image
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                        src={mediaDirectory.set(media.path)}
                        alt="media"
                      />
                    )}
                  </div>
                ))}
            </div>
            {(pages || 0) > 1 && (
              <Pagination current={page} totalPages={pages} setPage={setPage} />
            )}
          </div>
        </DropFiles>
      </div>
    </div>
  );
};
export const MultiMediaComponent: FC<{
  label: string;
  description: string;
  allData: {
    content: string;
    id?: string;
    image?: Array<{
      id: string;
      path: string;
    }>;
  }[];
  value?: Array<{
    path: string;
    id: string;
  }>;
  text: string;
  name: string;
  error?: any;
  onOpen?: () => void;
  onClose?: () => void;
  onChange: (event: {
    target: {
      name: string;
      value?: Array<{
        id: string;
        path: string;
      }>;
    };
  }) => void;
}> = (props) => {
  const { onOpen, onClose, name, error, text, onChange, value, allData } = props;
  const user = useUser();
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, [value]);
  const [modal, setShowModal] = useState(false);
  const [mediaModal, setMediaModal] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();
  const changeMedia = useCallback(
    (
      m:
        | {
            path: string;
            id: string;
          }
        | {
            path: string;
            id: string;
          }[]
    ) => {
      const mediaArray = Array.isArray(m) ? m : [m];
      const newMedia = [...(currentMedia || []), ...mediaArray];
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia]
  );
  const showModal = useCallback(() => {
    if (!modal) {
      onOpen?.();
    } else {
      onClose?.();
    }
    setShowModal(!modal);
  }, [modal, onOpen, onClose]);
  const closeDesignModal = useCallback(() => {
    onClose?.();
    setMediaModal(false);
  }, [modal]);
  const clearMedia = useCallback(
    (topIndex: number) => () => {
      const newMedia = currentMedia?.filter((f, index) => index !== topIndex);
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia]
  );
  const designMedia = useCallback(() => {
    onOpen?.();
    setMediaModal(true);
  }, []);

  const t = useT();

  return (
    <>
      <div className="flex flex-col gap-[8px] bg-input rounded-bl-[8px] select-none">
        {modal && <MediaBox setMedia={changeMedia} closeModal={showModal} />}
        {mediaModal && !!user?.tier?.ai && (
          <Polonto setMedia={changeMedia} closeModal={closeDesignModal} />
        )}
        <div className="flex gap-[10px]">
          <div className="flex">
            <Button
              onClick={showModal}
              className="ms-[10px] rounded-[4px] mb-[10px] gap-[8px] !text-primary justify-center items-center w-[127px] flex border border-dashed border-customColor21 bg-input"
            >
              <div className="flex gap-[5px] items-center">
                <div>
                  <svg
                    className="!text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M19.5 3H7.5C7.10218 3 6.72064 3.15804 6.43934 3.43934C6.15804 3.72064 6 4.10218 6 4.5V6H4.5C4.10218 6 3.72064 6.15804 3.43934 6.43934C3.15804 6.72064 3 7.10218 3 7.5V19.5C3 19.8978 3.15804 20.2794 3.43934 20.5607C3.72064 20.842 4.10218 21 4.5 21H16.5C16.8978 21 17.2794 20.842 17.5607 20.5607C17.842 20.2794 18 19.8978 18 19.5V18H19.5C19.8978 18 20.2794 17.842 20.5607 17.5607C20.842 17.2794 21 16.8978 21 16.5V4.5C21 4.10218 20.842 3.72064 20.5607 3.43934C20.2794 3.15804 19.8978 3 19.5 3ZM7.5 4.5H19.5V11.0044L17.9344 9.43875C17.6531 9.15766 17.2717 8.99976 16.8741 8.99976C16.4764 8.99976 16.095 9.15766 15.8137 9.43875L8.75344 16.5H7.5V4.5ZM16.5 19.5H4.5V7.5H6V16.5C6 16.8978 6.15804 17.2794 6.43934 17.5607C6.72064 17.842 7.10218 18 7.5 18H16.5V19.5ZM19.5 16.5H10.875L16.875 10.5L19.5 13.125V16.5ZM11.25 10.5C11.695 10.5 12.13 10.368 12.5 10.1208C12.87 9.87357 13.1584 9.52217 13.3287 9.11104C13.499 8.6999 13.5436 8.2475 13.4568 7.81105C13.37 7.37459 13.1557 6.97368 12.841 6.65901C12.5263 6.34434 12.1254 6.13005 11.689 6.04323C11.2525 5.95642 10.8001 6.00097 10.389 6.17127C9.97783 6.34157 9.62643 6.62996 9.37919 6.99997C9.13196 7.36998 9 7.80499 9 8.25C9 8.84674 9.23705 9.41903 9.65901 9.84099C10.081 10.2629 10.6533 10.5 11.25 10.5ZM11.25 7.5C11.3983 7.5 11.5433 7.54399 11.6667 7.6264C11.79 7.70881 11.8861 7.82594 11.9429 7.96299C11.9997 8.10003 12.0145 8.25083 11.9856 8.39632C11.9566 8.5418 11.8852 8.67544 11.7803 8.78033C11.6754 8.88522 11.5418 8.95665 11.3963 8.98559C11.2508 9.01453 11.1 8.99968 10.963 8.94291C10.8259 8.88614 10.7088 8.79001 10.6264 8.66668C10.544 8.54334 10.5 8.39834 10.5 8.25C10.5 8.05109 10.579 7.86032 10.7197 7.71967C10.8603 7.57902 11.0511 7.5 11.25 7.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="text-[12px] font-[500] !text-current">
                  {t('insert_media', 'Insert Media')}
                </div>
              </div>
            </Button>

            <Button
              onClick={designMedia}
              className="ms-[10px] rounded-[4px] mb-[10px] gap-[8px] !text-primary justify-center items-center w-[127px] flex border border-dashed border-customColor21 bg-input"
            >
              <div className="flex gap-[5px] items-center">
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
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="text-[12px] font-[500] !text-current">
                  {t('design_media', 'Design Media')}
                </div>
              </div>
            </Button>

            <ThirdPartyMedia allData={allData} onChange={changeMedia} />

            {!!user?.tier?.ai && (
              <AiImage value={text} onChange={changeMedia} />
            )}
          </div>

          {!!currentMedia &&
            currentMedia.map((media, index) => (
              <>
                <div className="cursor-pointer w-[40px] h-[40px] border-2 border-tableBorder relative flex">
                  <div
                    className="w-full h-full"
                    onClick={() => window.open(mediaDirectory.set(media?.path))}
                  >
                    {media?.path?.indexOf('mp4') > -1 ? (
                      <VideoFrame url={mediaDirectory.set(media?.path)} />
                    ) : (
                      <img
                        className="w-full h-full object-cover"
                        src={mediaDirectory.set(media?.path)}
                      />
                    )}
                  </div>
                  <div
                    onClick={clearMedia(index)}
                    className="rounded-full w-[15px] h-[15px] bg-red-800 text-textColor flex justify-center items-center absolute -end-[4px] -top-[4px]"
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
  value?: {
    path: string;
    id: string;
  };
  name: string;
  onChange: (event: {
    target: {
      name: string;
      value?: {
        id: string;
        path: string;
      };
    };
  }) => void;
  type?: 'image' | 'video';
  width?: number;
  height?: number;
}> = (props) => {
  const t = useT();

  const { name, type, label, description, onChange, value, width, height } =
    props;
  const { getValues } = useSettings();
  const user = useUser();
  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentMedia(settings);
    }
  }, []);
  const [modal, setShowModal] = useState(false);
  const [mediaModal, setMediaModal] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();
  const closeDesignModal = useCallback(() => {
    setMediaModal(false);
  }, [modal]);
  const showDesignModal = useCallback(() => {
    setMediaModal(true);
  }, [modal]);
  const changeMedia = useCallback((m: { path: string; id: string }) => {
    setCurrentMedia(m);
    onChange({
      target: {
        name,
        value: m,
      },
    });
  }, []);
  const showModal = useCallback(() => {
    setShowModal(!modal);
  }, [modal]);
  const clearMedia = useCallback(() => {
    setCurrentMedia(undefined);
    onChange({
      target: {
        name,
        value: undefined,
      },
    });
  }, [value]);
  return (
    <div className="flex flex-col gap-[8px]">
      {modal && (
        <MediaBox setMedia={changeMedia} closeModal={showModal} type={type} />
      )}
      {mediaModal && !!user?.tier?.ai && (
        <Polonto
          width={width}
          height={height}
          setMedia={changeMedia}
          closeModal={closeDesignModal}
        />
      )}
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
      <div className="flex gap-[5px]">
        <Button onClick={showModal}>{t('select', 'Select')}</Button>
        <Button onClick={showDesignModal} className="!bg-customColor45">
          {t('editor', 'Editor')}
        </Button>
        <Button secondary={true} onClick={clearMedia}>
          {t('clear', 'Clear')}
        </Button>
      </div>
    </div>
  );
};
