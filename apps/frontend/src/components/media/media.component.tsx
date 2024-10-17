'use client';

import { FC, useCallback, useEffect, useState } from 'react';
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

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as ImagesSvg } from '@gitroom/frontend/assets/images.svg';
import { ReactComponent as ImagesWhiteSvg } from '@gitroom/frontend/assets/images-w.svg';

const Polonto = dynamic(
  () => import('@gitroom/frontend/components/launches/polonto')
);
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
  const [pages, setPages] = useState(0);
  const [mediaList, setListMedia] = useState<Media[]>([]);
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();

  const [loading, setLoading] = useState(false);

  const loadMedia = useCallback(async () => {
    return (await fetch('/media')).json();
  }, []);

  const setNewMedia = useCallback(
    (media: Media) => () => {
      setMedia(media);
      closeModal();
    },
    []
  );

  const { data, mutate } = useSWR('get-media', loadMedia);

  useEffect(() => {
    if (data?.pages) {
      setPages(data.pages);
    }
    if (data?.results && data?.results?.length) {
      setListMedia([...data.results]);
    }
  }, [data]);

  return (
    <div className="fixed left-0 top-0 bg-primary/80 z-[300] w-full min-h-full p-4 md:p-[60px] animate-fade">
      <div className="max-w-[1000px] w-full h-full bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative mx-auto">
        <div className="flex flex-col">
          <div className="flex-1">
            <TopTitle title="Media Library" />
          </div>
          <button
            onClick={closeModal}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
          >
            <CloseXSvg />
          </button>

          {!!mediaList.length && (
            <button
              className="flex absolute right-[40px] top-[7px] pointer hover:bg-third rounded-lg transition-all group px-2.5 py-2.5 text-sm font-semibold bg-transparent text-gray-800 hover:bg-gray-100 focus:text-primary-500"
              type="button"
            >
              <div className="relative flex gap-2 items-center justify-center">
                <MultipartFileUploader
                  onUploadSuccess={mutate}
                  allowedFileTypes={
                    type === 'video'
                      ? 'video/mp4'
                      : type === 'image'
                      ? 'image/*'
                      : 'image/*,video/mp4'
                  }
                />
              </div>
            </button>
          )}
        </div>
        <div
          className={clsx(
            'flex flex-wrap gap-[10px] mt-[35px] pt-[20px]',
            !!mediaList.length && 'justify-center items-center text-textColor'
          )}
        >
          {!mediaList.length && (
            <div className="flex flex-col text-center">
              <div>You don{"'"}t have any assets yet.</div>
              <div>Click the button below to upload one</div>
              <div className="mt-[10px] justify-center items-center flex flex-col-reverse gap-[10px]">
                <MultipartFileUploader
                  onUploadSuccess={mutate}
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
                className="w-[120px] h-[120px] flex border-tableBorder border-2 cursor-pointer"
                onClick={setNewMedia(media)}
              >
                {media.path.indexOf('mp4') > -1 ? (
                  <VideoFrame url={mediaDirectory.set(media.path)} />
                ) : (
                  <img
                    className="w-full h-full object-cover"
                    src={mediaDirectory.set(media.path)}
                    alt="media"
                  />
                )}
              </div>
            ))}
          {loading && (
            <div className="w-[200px] h-[200px] flex border-tableBorder border-2 cursor-pointer relative">
              <div className="absolute left-0 top-0 w-full h-full -mt-[50px] flex justify-center items-center">
                <LoadingComponent />
              </div>
            </div>
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
  const user = useUser();
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, []);

  const [modal, setShowModal] = useState(false);
  const [mediaModal, setMediaModal] = useState(false);

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

  const closeDesignModal = useCallback(() => {
    setMediaModal(false);
  }, [modal]);

  const clearMedia = useCallback(
    (topIndex: number) => () => {
      const newMedia = currentMedia?.filter((f, index) => index !== topIndex);
      setCurrentMedia(newMedia);
      onChange({ target: { name, value: newMedia } });
    },
    [currentMedia]
  );

  const designMedia = useCallback(() => {
    setMediaModal(true);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-[8px] bg-input rounded-bl-[8px]">
        {modal && <MediaBox setMedia={changeMedia} closeModal={showModal} />}
        {mediaModal && !!user?.tier?.ai && (
          <Polonto setMedia={changeMedia} closeModal={closeDesignModal} />
        )}
        <div className="flex gap-[10px]">
          <div className="flex">
            <Button
              onClick={showModal}
              className="ml-[10px] rounded-[4px] mb-[10px] gap-[8px] !text-primary justify-center items-center w-[127px] flex border border-dashed border-customColor21 bg-input"
            >
              <div>
                <ImagesSvg className="!text-primary" />
              </div>
              <div className="text-[12px] font-[500] text-primary">
                Insert Media
              </div>
            </Button>

            <Button
              onClick={designMedia}
              className="ml-[10px] rounded-[4px] mb-[10px] gap-[8px] justify-center items-center w-[127px] flex border border-dashed border-customColor21 !bg-customColor45"
            >
              <div>
                <ImagesWhiteSvg />
              </div>
              <div className="text-[12px] font-[500] !text-white">
                Design Media
              </div>
            </Button>
          </div>

          {!!currentMedia &&
            currentMedia.map((media, index) => (
              <>
                <div className="cursor-pointer w-[40px] h-[40px] border-2 border-tableBorder relative flex">
                  <div
                    onClick={() => window.open(mediaDirectory.set(media.path))}
                  >
                    {media.path.indexOf('mp4') > -1 ? (
                      <VideoFrame url={mediaDirectory.set(media.path)} />
                    ) : (
                      <img
                        className="w-full h-full object-cover"
                        src={mediaDirectory.set(media.path)}
                      />
                    )}
                  </div>
                  <div
                    onClick={clearMedia(index)}
                    className="rounded-full w-[15px] h-[15px] bg-red-800 text-textColor flex justify-center items-center absolute -right-[4px] -top-[4px]"
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
  type?: 'image' | 'video';
  width?: number;
  height?: number;
}> = (props) => {
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
        <Button onClick={showModal}>Select</Button>
        <Button onClick={showDesignModal} className="!bg-customColor45">
          Editor
        </Button>
        <Button secondary={true} onClick={clearMedia}>
          Clear
        </Button>
      </div>
    </div>
  );
};
