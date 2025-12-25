'use client';

import React, {
  ChangeEvent,
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
import {
  MultipartFileUploader,
  useUppyUploader,
} from '@gitroom/frontend/components/media/new.uploader';
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
import { Dashboard } from '@uppy/react';
import { timer } from '@gitroom/helpers/utils/timer';
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
              'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:bg-forth h-10 w-10 hover:text-white border-newBorder',
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
}> = ({ type, standalone, setMedia }) => {
  const [page, setPage] = useState(0);
  const fetch = useFetch();
  const modals = useModals();
  const loadMedia = useCallback(async () => {
    return (await fetch(`/media?page=${page + 1}`)).json();
  }, [page]);
  const { data, mutate, isLoading } = useSWR(`get-media-${page}`, loadMedia);
  const [selected, setSelected] = useState([]);
  const t = useT();
  const uploaderRef = useRef<any>(null);
  const mediaDirectory = useMediaDirectory();

  const uppy = useUppyUploader({
    allowedFileTypes:
      type == 'image'
        ? 'image/*'
        : type == 'video'
        ? 'video/mp4'
        : 'image/*,video/mp4',
    onUploadSuccess: async (arr) => {
      uppy.clear();
      await mutate();
      if (standalone) {
        return;
      }
      setSelected((prevSelected) => {
        return [...prevSelected, ...arr];
      });
    },
  });

  const addRemoveSelected = useCallback(
    (media: any) => () => {
      if (standalone) {
        return;
      }
      const exists = selected.find((p: any) => p.id === media.id);
      if (exists) {
        setSelected(selected.filter((f: any) => f.id !== media.id));
        return;
      }
      setSelected([...selected, media]);
    },
    [selected]
  );

  const addMedia = useCallback(async () => {
    if (standalone) {
      return;
    }
    // @ts-ignore
    setMedia(selected);
    modals.closeCurrent();
  }, [selected]);

  const addToUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files).slice(0, 5);
    for (const file of files) {
      uppy.addFile(file);
    }
  }, []);

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

      const files = [];
      // @ts-ignore
      for (const item of clipboardItems) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      for (const file of files.slice(0, 5)) {
        uppy.addFile(file);
      }
    },
    []
  );

  const deleteImage = useCallback(
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

  const btn = useMemo(() => {
    return (
      <button
        onClick={() => uploaderRef?.current?.click()}
        className="cursor-pointer bg-btnSimple changeColor flex gap-[8px] h-[44px] px-[18px] justify-center items-center rounded-[8px]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M6.58333 0.75V12.4167M0.75 6.58333H12.4167"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div>Upload</div>
      </button>
    );
  }, []);

  return (
    <DropFiles className="flex flex-col flex-1" onDrop={dragAndDrop}>
      <div className="flex flex-col flex-1">
        <div
          className={clsx(
            'flex',
            !isLoading && !data?.results?.length && 'hidden'
          )}
        >
          {!isLoading && !!data?.results?.length && (
            <div className="flex-1 text-[14px] font-[600] whitespace-pre-line">
              Select or upload pictures (maximum 5 at a time).{'\n'}
              You can also drag & drop pictures.
            </div>
          )}
          <input
            type="file"
            ref={uploaderRef}
            onChange={addToUpload}
            className="hidden"
            multiple={true}
          />
          {!isLoading && !!data?.results?.length && btn}
        </div>
        <div className="w-full pointer-events-none relative mt-[5px] mb-[5px]">
          <div className="w-full h-[46px] overflow-hidden absolute left-0 bg-newBgColorInner uppyChange">
            <Dashboard
              height={46}
              uppy={uppy}
              id={`uploader`}
              showProgressDetails={true}
              hideUploadButton={true}
              hideRetryButton={true}
              hidePauseResumeButton={true}
              hideCancelButton={true}
              hideProgressAfterFinish={true}
            />
          </div>
          <div className="w-full h-[46px] uppyChange" />
        </div>
        <div
          className={clsx(
            'flex-1 relative',
            !isLoading &&
              !data?.results?.length &&
              'bg-newTextColor/[0.02] rounded-[12px]'
          )}
        >
          <div
            className={clsx(
              'absolute -left-[3px] -top-[3px] withp3 h-full overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner',
              !isLoading &&
                !data?.results?.length &&
                'flex justify-center items-center gap-[20px] flex-col'
            )}
          >
            {!isLoading && !data?.results?.length && (
              <>
                <svg
                  width="192"
                  height="151"
                  viewBox="0 0 192 151"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M109.75 59.0141C104.489 59.0141 113.46 -5.73557 91.0289 1.57563C69.7021 8.5269 99.5229 59.0141 94.5119 59.0141C89.5009 59.0141 54.4775 56.107 52.1458 71.9377C49.5418 89.6178 95.4225 79.7216 96.7894 81.9895C98.1563 84.2573 78.775 111.109 91.0289 119.324C103.724 127.835 119.934 96.3491 122.711 96.3491C125.489 96.3491 139.845 147.93 151.514 133.684C160.997 122.106 138.391 96.3491 142.873 96.3491C147.355 96.3491 180.793 98.9658 186.076 81.9895C192.534 61.2424 134.828 76.0575 131.352 71.9377C127.876 67.818 159.167 34.7484 142.873 25.987C126.785 17.3361 115.012 59.0141 109.75 59.0141Z"
                    stroke="white"
                    strokeOpacity="0.08"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <rect
                    x="22.6328"
                    y="62.541"
                    width="49.2079"
                    height="49.2079"
                    rx="12.6792"
                    transform="rotate(-16.275 22.6328 62.541)"
                    fill="#232222"
                  />
                  <path
                    d="M66.8573 81.5379L60.538 73.8505C59.3847 72.4421 58.0986 71.8279 56.9172 72.1076C55.7477 72.3838 54.8664 73.5134 54.4627 75.298L53.377 80.0552C53.1492 81.0592 52.6158 81.7748 51.8894 82.0519C51.1544 82.3446 50.2829 82.1692 49.4433 81.5678L49.0813 81.3089C47.9176 80.4896 46.7111 80.2818 45.6626 80.705C44.6142 81.1282 43.9074 82.1418 43.6491 83.5323L42.7814 88.278C42.4752 89.995 43.055 91.7139 44.3442 92.8742C45.6334 94.0345 47.406 94.4417 49.0739 93.9549L64.3851 89.4863C65.9931 89.017 67.2584 87.7753 67.7541 86.1722C68.2738 84.5621 67.924 82.8282 66.8573 81.5379Z"
                    fill="white"
                    fillOpacity="0.4"
                  />
                  <path
                    d="M45.8412 76.6818C48.0811 76.0281 49.367 73.6823 48.7133 71.4423C48.0595 69.2024 45.7137 67.9165 43.4738 68.5702C41.2338 69.2239 39.9479 71.5697 40.6017 73.8097C41.2554 76.0497 43.6012 77.3355 45.8412 76.6818Z"
                    fill="white"
                    fillOpacity="0.4"
                  />
                  <rect
                    x="64.8125"
                    y="70.6133"
                    width="66.3578"
                    height="66.3578"
                    rx="18.1132"
                    fill="#2C2B2B"
                  />
                  <path
                    d="M80.1261 117.087L80.0882 117.125C79.5762 116.006 79.2538 114.735 79.1211 113.332C79.2538 114.716 79.6141 115.968 80.1261 117.087Z"
                    fill="white"
                    fillOpacity="0.4"
                  />
                  <path
                    d="M92.3022 100.72C94.7948 100.72 96.8154 98.6991 96.8154 96.2065C96.8154 93.714 94.7948 91.6934 92.3022 91.6934C89.8097 91.6934 87.7891 93.714 87.7891 96.2065C87.7891 98.6991 89.8097 100.72 92.3022 100.72Z"
                    fill="white"
                    fillOpacity="0.4"
                  />
                  <path
                    d="M105.936 84.8301H90.0448C83.1423 84.8301 79.0273 88.945 79.0273 95.8476V111.739C79.0273 113.805 79.3876 115.607 80.0893 117.124C81.7201 120.727 85.2093 122.756 90.0448 122.756H105.936C112.838 122.756 116.953 118.641 116.953 111.739V107.396V95.8476C116.953 88.945 112.838 84.8301 105.936 84.8301ZM113.862 104.741C112.383 103.471 109.994 103.471 108.515 104.741L100.626 111.511C99.147 112.781 96.7577 112.781 95.2786 111.511L94.6339 110.98C93.2875 109.804 91.1447 109.691 89.6276 110.715L82.5355 115.474C82.1183 114.412 81.8718 113.18 81.8718 111.739V95.8476C81.8718 90.5 84.6973 87.6745 90.0448 87.6745H105.936C111.283 87.6745 114.109 90.5 114.109 95.8476V104.95L113.862 104.741Z"
                    fill="white"
                    fillOpacity="0.4"
                  />
                </svg>
                <div className="text-[20px] font-[600]">
                  You don't have any media yet
                </div>
                <div className="whitespace-pre-line text-newTextColor/[0.6] text-center">
                  Select or upload pictures (maximum 5 at a time). {'\n'}
                  You can also drag & drop pictures.
                </div>
                <div className="forceChange">{btn}</div>
              </>
            )}
            {isLoading && (
              <>
                {[...new Array(16)].map((_, i) => (
                  <div
                    className={clsx(
                      'px-[3px] py-[3px] float-left rounded-[6px] cursor-pointer w8-max aspect-square'
                    )}
                    key={i}
                  >
                    <div className="w-full h-full bg-newSep rounded-[6px] animate-pulse" />
                  </div>
                ))}
              </>
            )}
            {data?.results
              ?.filter((f: any) => {
                if (type === 'video') {
                  return f.path.indexOf('mp4') > -1;
                } else if (type === 'image') {
                  return f.path.indexOf('mp4') === -1;
                }
                return true;
              })
              .map((media: any) => (
                <div
                  className={clsx(
                    'group px-[3px] py-[3px] float-left rounded-[6px] w8-max aspect-square',
                    !standalone && 'cursor-pointer'
                  )}
                  key={media.id}
                >
                  <div
                    className={clsx(
                      'w-full h-full rounded-[6px] border-[4px] relative',
                      !!selected.find((p) => p.id === media.id)
                        ? 'border-[#612BD3]'
                        : 'border-transparent'
                    )}
                    onClick={addRemoveSelected(media)}
                  >
                    {!!selected.find((p: any) => p.id === media.id) ? (
                      <div className="flex justify-center items-center text-[14px] font-[500] w-[24px] h-[24px] rounded-full bg-[#612BD3] absolute -bottom-[10px] -end-[10px]">
                        {selected.findIndex((z: any) => z.id === media.id) + 1}
                      </div>
                    ) : (
                      <svg
                        className="cursor-pointer hidden z-[100] group-hover:block absolute -top-[5px] -end-[5px]"
                        onClick={deleteImage(media)}
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <ellipse
                          cx="9.96484"
                          cy="9.10742"
                          rx="6"
                          ry="5.5"
                          fill="white"
                        />
                        <path
                          d="M9 1.5C4.8675 1.5 1.5 4.8675 1.5 9C1.5 13.1325 4.8675 16.5 9 16.5C13.1325 16.5 16.5 13.1325 16.5 9C16.5 4.8675 13.1325 1.5 9 1.5ZM11.52 10.725C11.7375 10.9425 11.7375 11.3025 11.52 11.52C11.4075 11.6325 11.265 11.685 11.1225 11.685C10.98 11.685 10.8375 11.6325 10.725 11.52L9 9.795L7.275 11.52C7.1625 11.6325 7.02 11.685 6.8775 11.685C6.735 11.685 6.5925 11.6325 6.48 11.52C6.2625 11.3025 6.2625 10.9425 6.48 10.725L8.205 9L6.48 7.275C6.2625 7.0575 6.2625 6.6975 6.48 6.48C6.6975 6.2625 7.0575 6.2625 7.275 6.48L9 8.205L10.725 6.48C10.9425 6.2625 11.3025 6.2625 11.52 6.48C11.7375 6.6975 11.7375 7.0575 11.52 7.275L9.795 9L11.52 10.725Z"
                          fill="#FF3535"
                        />
                      </svg>
                    )}
                    <div className="w-full h-full rounded-[6px] overflow-hidden">
                      {media.path.indexOf('mp4') > -1 ? (
                        <VideoFrame url={mediaDirectory.set(media.path)} />
                      ) : (
                        <img
                          width="100%"
                          height="100%"
                          className="w-full h-full object-cover"
                          src={mediaDirectory.set(media.path)}
                          alt="media"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
        {(data?.pages || 0) > 1 && (
          <Pagination
            current={page}
            totalPages={data?.pages}
            setPage={setPage}
          />
        )}
        {!standalone && (
          <div className="flex justify-end mt-[32px] gap-[8px]">
            <button
              onClick={() => modals.closeCurrent()}
              className="cursor-pointer h-[52px] px-[20px] items-center justify-center border border-newTextColor/10 flex rounded-[10px]"
            >
              Cancel
            </button>
            {!isLoading && !!data?.results?.length && (
              <button
                onClick={standalone ? () => {} : addMedia}
                disabled={selected.length === 0}
                className="cursor-pointer text-white disabled:opacity-80 disabled:cursor-not-allowed h-[52px] px-[20px] items-center justify-center bg-[#612BD3] flex rounded-[10px]"
              >
                {t('add_selected_media', 'Add selected media')}
              </button>
            )}
          </div>
        )}
      </div>
    </DropFiles>
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
  toolBar?: React.ReactNode;
  information?: React.ReactNode;
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
    name,
    error,
    text,
    onChange,
    value,
    allData,
    dummy,
    toolBar,
    information,
  } = props;
  const user = useUser();
  const modals = useModals();
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, [value]);

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
      title: 'Media Library',
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
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

  const t = useT();

  return (
    <>
      <div className="b1 flex flex-col gap-[8px] rounded-bl-[8px] select-none w-full">
        <div className="flex gap-[10px] px-[12px]">
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
                  <div className="cursor-pointer rounded-[5px] w-[40px] h-[40px] border-2 border-tableBorder relative flex transition-all">
                    <svg
                      className="z-[20] dragging absolute pe-[1px] pb-[3px] -start-[4px] -top-[4px] cursor-move"
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                    >
                      <ellipse
                        cx="8.23242"
                        cy="7.5"
                        rx="6"
                        ry="5.5"
                        fill="white"
                      />
                      <path
                        d="M7.5 0C11.6421 0 15 3.35786 15 7.5C14.9998 11.642 11.642 15 7.5 15C3.35799 15 0.000197912 11.642 0 7.5C0 3.35786 3.35786 0 7.5 0ZM5.55566 8.38867C4.97286 8.38867 4.50026 8.86159 4.5 9.44434C4.5 10.0273 4.9727 10.5 5.55566 10.5C6.13858 10.4999 6.61133 10.0273 6.61133 9.44434C6.61107 8.86162 6.13842 8.38873 5.55566 8.38867ZM9.44434 8.38867C8.86158 8.38873 8.38893 8.86162 8.38867 9.44434C8.38867 10.0273 8.86142 10.4999 9.44434 10.5C10.0273 10.5 10.5 10.0273 10.5 9.44434C10.4997 8.86159 10.0271 8.38867 9.44434 8.38867ZM5.55566 9.38867C5.58614 9.38873 5.61107 9.41391 5.61133 9.44434C5.61133 9.47498 5.5863 9.49994 5.55566 9.5C5.52498 9.5 5.5 9.47502 5.5 9.44434C5.50026 9.41387 5.52514 9.38867 5.55566 9.38867ZM9.44434 9.38867C9.47486 9.38867 9.49974 9.41387 9.5 9.44434C9.5 9.47502 9.47502 9.5 9.44434 9.5C9.4137 9.49994 9.38867 9.47498 9.38867 9.44434C9.38893 9.41391 9.41386 9.38873 9.44434 9.38867ZM5.55566 4.5C4.97282 4.5 4.5002 4.97287 4.5 5.55566C4.50006 6.13858 4.97273 6.61133 5.55566 6.61133C6.13855 6.61127 6.61127 6.13855 6.61133 5.55566C6.61113 4.9729 6.13846 4.50006 5.55566 4.5ZM9.44434 4.5C8.86154 4.50006 8.38887 4.9729 8.38867 5.55566C8.38873 6.13855 8.86145 6.61127 9.44434 6.61133C10.0273 6.61133 10.4999 6.13858 10.5 5.55566C10.4998 4.97287 10.0272 4.5 9.44434 4.5ZM5.55566 5.5C5.58617 5.50006 5.61113 5.52519 5.61133 5.55566C5.61127 5.58626 5.58626 5.61127 5.55566 5.61133C5.52502 5.61133 5.50006 5.5863 5.5 5.55566C5.5002 5.52515 5.5251 5.5 5.55566 5.5ZM9.44434 5.5C9.4749 5.5 9.4998 5.52515 9.5 5.55566C9.49994 5.5863 9.47498 5.61133 9.44434 5.61133C9.41374 5.61127 9.38873 5.58626 9.38867 5.55566C9.38887 5.52519 9.41383 5.50006 9.44434 5.5Z"
                        fill="#618DFF"
                      />
                    </svg>

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
                        className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bg-black/80 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-[9]"
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

                    <svg
                      onClick={clearMedia(index)}
                      className="absolute -end-[4px] -top-[4px] z-[20] rounded-full bg-white"
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                    >
                      <path
                        d="M7.5 0C3.3675 0 0 3.3675 0 7.5C0 11.6325 3.3675 15 7.5 15C11.6325 15 15 11.6325 15 7.5C15 3.3675 11.6325 0 7.5 0ZM10.02 9.225C10.2375 9.4425 10.2375 9.8025 10.02 10.02C9.9075 10.1325 9.765 10.185 9.6225 10.185C9.48 10.185 9.3375 10.1325 9.225 10.02L7.5 8.295L5.775 10.02C5.6625 10.1325 5.52 10.185 5.3775 10.185C5.235 10.185 5.0925 10.1325 4.98 10.02C4.7625 9.8025 4.7625 9.4425 4.98 9.225L6.705 7.5L4.98 5.775C4.7625 5.5575 4.7625 5.1975 4.98 4.98C5.1975 4.7625 5.5575 4.7625 5.775 4.98L7.5 6.705L9.225 4.98C9.4425 4.7625 9.8025 4.7625 10.02 4.98C10.2375 5.1975 10.2375 5.5575 10.02 5.775L8.295 7.5L10.02 9.225Z"
                        fill="#FF3535"
                      />
                    </svg>
                  </div>
                </Fragment>
              ))}
            </ReactSortable>
          )}
        </div>
        {!dummy && (
          <div className="flex gap-[8px] px-[12px] border-t border-newColColor w-full b1 text-textColor">
            <div className="flex py-[10px] b2 items-center gap-[4px]">
              <div
                onClick={showModal}
                className="cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]"
              >
                <div className="flex gap-[8px] items-center">
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_2352_53043)">
                        <path
                          d="M8.33333 1.99967H5.2C4.0799 1.99967 3.51984 1.99967 3.09202 2.21766C2.71569 2.40941 2.40973 2.71537 2.21799 3.09169C2 3.51952 2 4.07957 2 5.19967V10.7997C2 11.9198 2 12.4798 2.21799 12.9077C2.40973 13.284 2.71569 13.5899 3.09202 13.7817C3.51984 13.9997 4.07989 13.9997 5.2 13.9997H11.3333C11.9533 13.9997 12.2633 13.9997 12.5176 13.9315C13.2078 13.7466 13.7469 13.2075 13.9319 12.5173C14 12.263 14 11.953 14 11.333M12.6667 5.33301V1.33301M10.6667 3.33301H14.6667M7 5.66634C7 6.40272 6.40305 6.99967 5.66667 6.99967C4.93029 6.99967 4.33333 6.40272 4.33333 5.66634C4.33333 4.92996 4.93029 4.33301 5.66667 4.33301C6.40305 4.33301 7 4.92996 7 5.66634ZM9.99336 7.94511L4.3541 13.0717C4.03691 13.3601 3.87831 13.5042 3.86429 13.6291C3.85213 13.7374 3.89364 13.8448 3.97546 13.9167C4.06985 13.9997 4.28419 13.9997 4.71286 13.9997H10.9707C11.9301 13.9997 12.4098 13.9997 12.7866 13.8385C13.2596 13.6361 13.6365 13.2593 13.8388 12.7863C14 12.4095 14 11.9298 14 10.9703C14 10.6475 14 10.4861 13.9647 10.3358C13.9204 10.1469 13.8353 9.96991 13.7155 9.81727C13.6202 9.69581 13.4941 9.59497 13.242 9.39331L11.3772 7.90145C11.1249 7.69961 10.9988 7.5987 10.8599 7.56308C10.7374 7.53169 10.6086 7.53575 10.4884 7.5748C10.352 7.6191 10.2324 7.72777 9.99336 7.94511Z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_2352_53043">
                          <rect width="16" height="16" fill="currentColor" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div className="text-[10px] font-[600] maxMedia:hidden block">
                    {t('insert_media', 'Insert Media')}
                  </div>
                </div>
              </div>
              <div
                onClick={designMedia}
                className="cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]"
              >
                <div className="flex gap-[5px] items-center">
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_2352_53048)">
                        <path
                          d="M7.79167 1.99984H5.2C4.07989 1.99984 3.51984 1.99984 3.09202 2.21782C2.71569 2.40957 2.40973 2.71553 2.21799 3.09186C2 3.51968 2 4.07973 2 5.19984V10.7998C2 11.9199 2 12.48 2.21799 12.9078C2.40973 13.2841 2.71569 13.5901 3.09202 13.7818C3.51984 13.9998 4.07989 13.9998 5.2 13.9998H11.3333C11.9533 13.9998 12.2633 13.9998 12.5176 13.9317C13.2078 13.7468 13.7469 13.2077 13.9319 12.5175C14 12.2631 14 11.9532 14 11.3332M7 5.6665C7 6.40288 6.40305 6.99984 5.66667 6.99984C4.93029 6.99984 4.33333 6.40288 4.33333 5.6665C4.33333 4.93012 4.93029 4.33317 5.66667 4.33317C6.40305 4.33317 7 4.93012 7 5.6665ZM9.99336 7.94527L4.3541 13.0719C4.03691 13.3602 3.87831 13.5044 3.86429 13.6293C3.85213 13.7376 3.89364 13.8449 3.97546 13.9169C4.06985 13.9998 4.28419 13.9998 4.71286 13.9998H10.9707C11.9301 13.9998 12.4098 13.9998 12.7866 13.8387C13.2596 13.6363 13.6365 13.2595 13.8388 12.7864C14 12.4097 14 11.9299 14 10.9705C14 10.6477 14 10.4863 13.9647 10.3359C13.9204 10.147 13.8353 9.97007 13.7155 9.81743C13.6202 9.69597 13.4941 9.59514 13.242 9.39348L11.3772 7.90161C11.1249 7.69978 10.9988 7.59886 10.8599 7.56324C10.7374 7.53185 10.6086 7.53592 10.4884 7.57496C10.352 7.61926 10.2324 7.72794 9.99336 7.94527ZM15.0951 6.49981L13.0275 5.90908C12.9285 5.88079 12.879 5.86664 12.8328 5.84544C12.7918 5.82662 12.7528 5.80368 12.7164 5.77698C12.6755 5.74692 12.6391 5.71051 12.5663 5.6377L10.2617 3.33317C9.80143 2.87292 9.80144 2.1267 10.2617 1.66646C10.7219 1.20623 11.4681 1.20623 11.9284 1.66647L14.2329 3.97103C14.3058 4.04384 14.3422 4.08025 14.3722 4.12121C14.3989 4.15757 14.4219 4.19655 14.4407 4.23755C14.4619 4.28373 14.476 4.33323 14.5043 4.43224L15.0951 6.49981Z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_2352_53048">
                          <rect width="16" height="16" fill="currentColor" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div className="text-[10px] font-[600] iconBreak:hidden block">
                    {t('design_media', 'Design Media')}
                  </div>
                </div>
              </div>

              <ThirdPartyMedia allData={allData} onChange={changeMedia} />

              {!!user?.tier?.ai && (
                <>
                  <AiImage value={text} onChange={changeMedia} />
                  <AiVideo value={text} onChange={changeMedia} />
                </>
              )}
            </div>
            <div className="text-newColColor h-full flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2"
                height="17"
                viewBox="0 0 2 17"
                fill="none"
              >
                <path
                  d="M0.75 0.75V16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            {!!toolBar && (
              <div className="flex py-[10px] b2 items-center gap-[4px]">
                {toolBar}
              </div>
            )}
            {information && (
              <div className="flex-1 justify-end flex py-[10px] b2 items-center gap-[4px]">
                {information}
              </div>
            )}
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
