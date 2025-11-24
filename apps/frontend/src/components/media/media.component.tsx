'use client';

import React, {
  ClipboardEvent,
  FC,
  Fragment,
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
import { MultipartFileUploader } from '@gitroom/frontend/components/media/new.uploader';
import dynamic from 'next/dynamic';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AiImage } from '@gitroom/frontend/components/launches/ai.image';
import Image from 'next/image';
import { DropFiles } from '@gitroom/frontend/components/layout/drop.files';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ThirdPartyMedia } from '@gitroom/frontend/components/third-parties/third-party.media';
import { ReactSortable } from 'react-sortablejs';
import {
  MediaComponentInner,
  useMediaSettings,
} from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { AiVideo } from '@gitroom/frontend/components/launches/ai.video';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
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
    useState<(params: { id: string; path: string }[]) => void | undefined>();
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
  setMedia: (params: { id: string; path: string }[]) => void;
  standalone?: boolean;
  type?: 'image' | 'video';
  closeModal: () => void;
}> = (props) => {
  const { setMedia, type, closeModal } = props;
  const [mediaList, setListMedia] = useState<Media[]>([]);
  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
  const ref = useRef<any>(null);

  useEffect(() => {
    setActivateExitButton(false);
    return () => {
      setActivateExitButton(true);
    };
  }, []);

  const loadMedia = useCallback(async () => {
    return (await fetch(`/media?page=${page + 1}`)).json();
  }, [page]);

  const setNewMedia = useCallback(
    (media: Media) => () => {
      if (props.standalone) {
        return;
      }
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
    },
    [selectedMedia]
  );

  const addNewMedia = useCallback(
    (media: Media[]) => () => {
      if (props.standalone) {
        return;
      }
      setSelectedMedia((currentMedia) => [...currentMedia, ...media]);
      // closeModal();
    },
    [selectedMedia]
  );
  const addMedia = useCallback(async () => {
    if (props.standalone) {
      return;
    }
    // @ts-ignore
    setMedia(selectedMedia);
    closeModal();
  }, [selectedMedia]);
  const { data, mutate } = useSWR(`get-media-${page}`, loadMedia);

  const finishUpload = useCallback(
    async (res: any) => {
      const lastMedia = mediaList?.[0]?.id;
      const newData = await mutate();
      const untilLastMedia = newData.results.findIndex(
        (f: any) => f.id === lastMedia
      );
      const onlyNewMedia = newData.results.slice(
        0,
        untilLastMedia === -1 ? newData.results.length : untilLastMedia
      );

      if (props.standalone) {
        return;
      }

      addNewMedia(onlyNewMedia)();
    },
    [mutate, addNewMedia, mediaList, selectedMedia]
  );

  const dragAndDrop = useCallback(
    async (event: ClipboardEvent<HTMLDivElement> | File[]) => {
      if (!ref?.current?.setOptions) {
        return;
      }

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

  const refNew = useRef(null);

  useEffect(() => {
    if (data?.pages) {
      setPages(data.pages);
    }
    if (data?.results && data?.results?.length) {
      setListMedia([...data.results]);
    }
  }, [data]);

  useEffect(() => {
    refNew?.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, []);

  const t = useT();

  return (
    <div
      {...(props.standalone
        ? {
            className:
              'bg-newBgColorInner p-[20px] flex flex-col gap-[15px] transition-all',
          }
        : {
            ref: refNew,
            className:
              'removeEditor fixed start-0 top-0 bg-primary/80 z-[300] w-full min-h-full p-4 md:p-[60px] animate-fade',
          })}
    >
      <div
        {...(props.standalone
          ? {}
          : {
              className:
                'max-w-[1000px] w-full h-full bg-newBgColorInner border-tableBorder border-2 rounded-xl relative mx-auto',
            })}
      >
        <DropFiles onDrop={dragAndDrop}>
          <div className="pb-[20px] px-[20px] w-full h-full">
            <div className="flex flex-col">
              <div className="flex-1">
                {!props.standalone ? (
                  <TopTitle title="Media Library" />
                ) : (
                  <div className="h-[100px]" />
                )}
              </div>
              {!props.standalone ? (
                <button
                  onClick={closeModal}
                  className="outline-none z-[300] absolute end-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
              ) : (
                <div />
              )}

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
                    <div className="relative flex flex-1 pe-[55px] gap-2 items-center justify-center">
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
                      <Button
                        onClick={props.standalone ? () => {} : addMedia}
                        className="!text-white"
                      >
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
                    onClick={props.standalone ? () => {} : setNewMedia(media)}
                  >
                    <div
                      onClick={removeItem(media)}
                      className="border border-red-400 !text-white flex justify-center items-center absolute w-[20px] z-[100] h-[20px] rounded-full bg-red-700 -top-[5px] -end-[5px]"
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
  dummy: boolean;
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
        alt?: string;
        thumbnail?: string;
        thumbnailTimestamp?: number;
      }>;
    };
  }) => void;
}> = (props) => {
  const {
    onOpen,
    onClose,
    name,
    error,
    text,
    onChange,
    value,
    allData,
    dummy,
  } = props;
  const user = useUser();
  const modals = useModals();
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, [value]);
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
    modals.openModal({
      askClose: false,
      children: (close) => (
        <MediaBox setMedia={changeMedia} closeModal={close} />
      ),
    });
  }, [changeMedia]);

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
    if (!!user?.tier?.ai && !dummy) {
      modals.openModal({
        askClose: false,
        title: 'Design Media',
        size: '80%',
        children: (close) => (
          <Polonto setMedia={changeMedia} closeModal={close} />
        ),
      });
    }
  }, [changeMedia]);

  const mediaSettings = useMediaSettings();

  const t = useT();

  return (
    <>
      <div className="b1 flex flex-col gap-[8px] bg-bigStrip rounded-bl-[8px] select-none w-full">
        <div className="flex gap-[10px]">
          <Button
            onClick={showModal}
            className="ms-[10px] !px-[0] !h-[80px] w-[80px] rounded-[4px] mb-[10px] gap-[8px] !text-primary justify-center items-center flex border border-dashed border-newBgLineColor bg-newColColor"
          >
            <div className="flex flex-col gap-[5px] items-center">
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

          {!!currentMedia && (
            <ReactSortable
              list={currentMedia}
              setList={(value) =>
                onChange({ target: { name: 'upload', value } })
              }
              className="flex gap-[10px] sortable-container"
              animation={200}
              swap={true}
              handle=".dragging"
            >
              {currentMedia.map((media, index) => (
                <Fragment key={media.id}>
                  <div className="cursor-pointer rounded-[4px] w-[80px] h-[80px] border-2 border-tableBorder relative flex transition-all">
                    <div className="dragging text-sm absolute pe-[1px] z-[10] pb-[3px] -start-[4px] -top-[4px] bg-blue-700 cursor-move rounded-full w-[15px] h-[15px] text-white flex justify-center items-center">
                      ::
                    </div>

                    <div className="w-full h-full relative group">
                      <div
                        onClick={async () => {
                          modals.openModal({
                            title: 'Media Settings',
                            children: (close) => (
                              <MediaComponentInner
                                media={media as any}
                                onClose={close}
                                onSelect={(value: any) => {
                                  console.log(value);
                                  onChange({
                                    target: {
                                      name: 'upload',
                                      value: currentMedia.map((p) => {
                                        if (p.id === media.id) {
                                          return {
                                            ...p,
                                            ...value,
                                          };
                                        }
                                        return p;
                                      }),
                                    },
                                  });
                                }}
                              />
                            ),
                          });
                        }}
                        className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bg-black/80 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-[100]"
                      >
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 40 40"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="cursor-pointer relative z-[200]"
                        >
                          <path
                            d="M19.9987 15.5C19.1087 15.5 18.2387 15.7639 17.4986 16.2584C16.7586 16.7528 16.1818 17.4556 15.8413 18.2779C15.5007 19.1002 15.4115 20.005 15.5852 20.8779C15.7588 21.7508 16.1874 22.5526 16.8167 23.182C17.4461 23.8113 18.2479 24.2399 19.1208 24.4135C19.9937 24.5871 20.8985 24.498 21.7208 24.1574C22.5431 23.8168 23.2459 23.2401 23.7403 22.5C24.2348 21.76 24.4987 20.89 24.4987 20C24.4975 18.8069 24.023 17.663 23.1793 16.8194C22.3357 15.9757 21.1918 15.5012 19.9987 15.5ZM19.9987 23C19.4054 23 18.8254 22.824 18.332 22.4944C17.8387 22.1647 17.4541 21.6962 17.2271 21.148C17 20.5999 16.9406 19.9967 17.0564 19.4147C17.1721 18.8328 17.4578 18.2982 17.8774 17.8787C18.297 17.4591 18.8315 17.1734 19.4134 17.0576C19.9954 16.9419 20.5986 17.0013 21.1468 17.2283C21.6949 17.4554 22.1635 17.8399 22.4931 18.3333C22.8228 18.8266 22.9987 19.4066 22.9987 20C22.9987 20.7956 22.6826 21.5587 22.12 22.1213C21.5574 22.6839 20.7944 23 19.9987 23ZM30.3056 18.0509C30.2847 17.9453 30.2413 17.8454 30.1784 17.7581C30.1155 17.6707 30.0345 17.5979 29.9409 17.5447L27.1443 15.9509L27.1331 12.799C27.1327 12.6905 27.1089 12.5833 27.063 12.4849C27.0172 12.3865 26.9506 12.2992 26.8678 12.229C25.8533 11.3709 24.6851 10.7134 23.4253 10.2912C23.3261 10.2577 23.2209 10.2452 23.1166 10.2547C23.0123 10.2643 22.9111 10.2955 22.8197 10.3465L19.9987 11.9234L17.175 10.3437C17.0834 10.2924 16.9821 10.2609 16.8776 10.2513C16.7732 10.2416 16.6678 10.2539 16.5684 10.2875C15.3095 10.7127 14.1426 11.3728 13.1297 12.2328C13.0469 12.3028 12.9804 12.39 12.9346 12.4882C12.8888 12.5865 12.8648 12.6935 12.8643 12.8019L12.8503 15.9565L10.0537 17.5503C9.96015 17.6036 9.87916 17.6763 9.81623 17.7637C9.7533 17.8511 9.70992 17.9509 9.68903 18.0565C9.43309 19.3427 9.43309 20.6667 9.68903 21.9528C9.70992 22.0584 9.7533 22.1583 9.81623 22.2456C9.87916 22.333 9.96015 22.4058 10.0537 22.459L12.8503 24.0528L12.8615 27.2047C12.8619 27.3132 12.8858 27.4204 12.9316 27.5188C12.9774 27.6172 13.044 27.7045 13.1268 27.7747C14.1413 28.6328 15.3095 29.2904 16.5693 29.7125C16.6686 29.7461 16.7737 29.7585 16.878 29.749C16.9823 29.7394 17.0835 29.7082 17.175 29.6572L19.9987 28.0765L22.8225 29.6562C22.9342 29.7185 23.0602 29.7508 23.1881 29.75C23.27 29.75 23.3514 29.7367 23.429 29.7106C24.6878 29.286 25.8547 28.6265 26.8678 27.7672C26.9505 27.6971 27.017 27.61 27.0628 27.5117C27.1087 27.4135 27.1326 27.3065 27.1331 27.1981L27.1472 24.0434L29.9437 22.4497C30.0373 22.3964 30.1183 22.3236 30.1812 22.2363C30.2441 22.1489 30.2875 22.049 30.3084 21.9434C30.5629 20.6583 30.562 19.3357 30.3056 18.0509ZM28.8993 21.3237L26.2209 22.8472C26.1035 22.9139 26.0064 23.0111 25.9397 23.1284C25.8853 23.2222 25.8281 23.3215 25.77 23.4153C25.6956 23.5335 25.6559 23.6703 25.6556 23.81L25.6415 26.8334C24.9216 27.3988 24.1195 27.8509 23.2631 28.174L20.5612 26.6684C20.449 26.6064 20.3228 26.5741 20.1947 26.5747H20.1768C20.0634 26.5747 19.949 26.5747 19.8356 26.5747C19.7014 26.5713 19.5688 26.6037 19.4512 26.6684L16.7475 28.1778C15.8892 27.8571 15.0849 27.4072 14.3625 26.8437L14.3522 23.825C14.3517 23.685 14.3121 23.548 14.2378 23.4294C14.1797 23.3356 14.1225 23.2419 14.069 23.1425C14.0028 23.0233 13.9056 22.9242 13.7878 22.8556L11.1065 21.3284C10.9678 20.4507 10.9678 19.5567 11.1065 18.679L13.7803 17.1528C13.8976 17.0861 13.9948 16.9889 14.0615 16.8715C14.1159 16.7778 14.1731 16.6784 14.2312 16.5847C14.3056 16.4664 14.3453 16.3297 14.3456 16.19L14.3597 13.1665C15.0796 12.6012 15.8816 12.1491 16.7381 11.8259L19.4362 13.3315C19.5536 13.3966 19.6864 13.429 19.8206 13.4253C19.934 13.4253 20.0484 13.4253 20.1618 13.4253C20.296 13.4286 20.4287 13.3963 20.5462 13.3315L23.25 11.8222C24.1082 12.1429 24.9125 12.5927 25.635 13.1562L25.6453 16.175C25.6457 16.3149 25.6854 16.452 25.7597 16.5706C25.8178 16.6644 25.875 16.7581 25.9284 16.8575C25.9947 16.9767 26.0918 17.0758 26.2097 17.1444L28.8909 18.6715C29.0315 19.5499 29.0331 20.4449 28.8956 21.3237H28.8993Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      {media?.path?.indexOf('mp4') > -1 ? (
                        <VideoFrame url={mediaDirectory.set(media?.path)} />
                      ) : (
                        <img
                          className="w-full h-full object-cover rounded-[4px]"
                          src={mediaDirectory.set(media?.path)}
                        />
                      )}
                    </div>
                    <div
                      onClick={clearMedia(index)}
                      className="rounded-full w-[15px] h-[15px] bg-red-800 text-white flex justify-center items-center absolute -end-[4px] -top-[4px]"
                    >
                      x
                    </div>
                  </div>
                </Fragment>
              ))}
            </ReactSortable>
          )}
        </div>
        {!dummy && (
          <div className="flex gap-[10px] bg-newBgLineColor w-full b1">
            <div className="flex py-[10px] b2">
              <Button
                onClick={designMedia}
                className="ms-[10px] rounded-[4px] gap-[8px] !text-primary justify-center items-center w-[127px] flex border border-dashed border-newBgLineColor bg-newColColor"
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
                <>
                  <AiImage value={text} onChange={changeMedia} />
                  <AiVideo value={text} onChange={changeMedia} />
                </>
              )}
            </div>
          </div>
        )}
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
  const changeMedia = useCallback((m: { path: string; id: string }[]) => {
    setCurrentMedia(m[0]);
    onChange({
      target: {
        name,
        value: m[0],
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
            src={currentMedia.path}
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
