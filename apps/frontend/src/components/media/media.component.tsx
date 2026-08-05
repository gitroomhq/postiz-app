'use client';

import React, {
  FC,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import EventEmitter from 'events';
import clsx from 'clsx';
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import dynamic from 'next/dynamic';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AiImage } from '@gitroom/frontend/components/launches/ai.image';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ThirdPartyMedia } from '@gitroom/frontend/components/third-parties/third-party.media';
import { ReactSortable } from 'react-sortablejs';
import { MediaComponentInner } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { AiVideo } from '@gitroom/frontend/components/launches/ai.video';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  CloseCircleIcon,
  DragHandleIcon,
  MediaSettingsIcon,
  InsertMediaIcon,
  DesignMediaIcon,
  VerticalDividerIcon,
} from '@gitroom/frontend/components/ui/icons';

const Polonto = dynamic(
  () => import('@gitroom/frontend/components/launches/polonto')
);
const showModalEmitter = new EventEmitter();

export { Pagination } from '@gitroom/frontend/components/media/media.pagination';
import { MediaBox } from '@gitroom/frontend/components/media/media.box';
export { MediaBox };

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

export const MultiMediaComponent: FC<{
  label: string;
  description: string;
  mediaNotAvailable?: boolean;
  dummy: boolean;
  // The agent composer draws the toolbar buttons as ghosts inside its frame;
  // the post composer keeps its filled pills. Same buttons, same handlers.
  ghost?: boolean;
  // Agent splits thumbs (above the textarea) from the toolbar (inside controls).
  // Post composer leaves this unset and renders both together.
  ghostPart?: 'thumbs' | 'toolbar' | 'all';
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
    ghost,
    ghostPart = 'all',
    toolBar,
    information,
    mediaNotAvailable,
  } = props;
  const showThumbs = !ghost || ghostPart === 'all' || ghostPart === 'thumbs';
  const showToolbar = !ghost || ghostPart === 'all' || ghostPart === 'toolbar';
  const user = useUser();
  const modals = useModals();
  const t = useT();
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
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      children: (close) => (
        <MediaBox setMedia={changeMedia} closeModal={close} />
      ),
    });
  }, [changeMedia, t]);

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
        title: t('design_media', 'Design Media'),
        size: '80%',
        children: (close) => (
          <Polonto setMedia={changeMedia} closeModal={close} />
        ),
      });
    }
  }, [changeMedia, t]);

  if (ghost && ghostPart === 'thumbs' && !currentMedia?.length) {
    return null;
  }

  return (
    <>
      <div
        className={clsx(
          'b1 flex select-none w-full',
          ghost && ghostPart === 'thumbs'
            ? 'flex-wrap'
            : 'flex-col gap-[8px] rounded-bl-[8px]'
        )}
      >
        {showThumbs && (
          <div
            className={clsx(
              'flex',
              ghost
                ? 'flex-wrap gap-[7px] pb-[3px]'
                : 'gap-[10px] px-[12px]'
            )}
          >
            {!!currentMedia && (
              <ReactSortable
                list={currentMedia}
                setList={(next) =>
                  onChange({ target: { name: 'upload', value: next } })
                }
                className={clsx(
                  'sortable-container flex',
                  ghost ? 'flex-wrap gap-[7px]' : 'gap-[10px]'
                )}
                animation={200}
                swap={true}
                handle=".dragging"
              >
                {currentMedia.map((media, index) => (
                  <div
                    key={media.id}
                    className={clsx(
                      'relative flex cursor-pointer transition-all',
                      ghost
                        ? 'h-[58px] w-[58px] rounded-[9px] bg-pqSettings shadow-[inset_0_0_0_1px_var(--border)]'
                        : 'h-[40px] w-[40px] rounded-[5px] border-2 border-tableBorder'
                    )}
                  >
                    {!ghost && (
                      <DragHandleIcon className="z-[20] dragging absolute pe-[1px] pb-[3px] -start-[4px] -top-[4px] cursor-move" />
                    )}

                    <div className="w-full h-full relative group overflow-hidden rounded-[inherit]">
                      {!ghost && (
                        <div
                          onClick={async () => {
                            modals.openModal({
                              title: t('change_alt_text', 'Change alt text'),
                              children: (close) => (
                                <MediaComponentInner
                                  media={media as any}
                                  onClose={close}
                                  onSelect={(next: any) => {
                                    onChange({
                                      target: {
                                        name: 'upload',
                                        value: currentMedia.map((p) => {
                                          if (p.id === media.id) {
                                            return {
                                              ...p,
                                              ...next,
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
                          <MediaSettingsIcon className="cursor-pointer relative z-[200]" />
                        </div>
                      )}
                      {hasExtension(media?.path, 'mp4') ? (
                        <VideoFrame url={mediaDirectory.set(media?.path)} />
                      ) : (
                        <img
                          className={clsx(
                            'w-full h-full object-cover',
                            ghost ? 'rounded-[9px]' : 'rounded-[4px]'
                          )}
                          src={mediaDirectory.set(media?.path)}
                        />
                      )}
                    </div>

                    {ghost ? (
                      <button
                        type="button"
                        onClick={clearMedia(index)}
                        aria-label="Remove"
                        className="absolute -end-[5px] -top-[5px] z-[20] grid h-[17px] w-[17px] place-items-center rounded-full bg-pqWarn text-[10px] font-[700] leading-none text-pqOnBrand"
                      >
                        ×
                      </button>
                    ) : (
                      <CloseCircleIcon
                        onClick={clearMedia(index)}
                        className="absolute -end-[4px] -top-[4px] z-[20] rounded-full bg-white"
                      />
                    )}
                  </div>
                ))}
              </ReactSortable>
            )}
          </div>
        )}
        {showToolbar && (
        <div
          className={clsx(
            'flex gap-[8px] w-full b1',
            ghost
              ? 'flex-wrap items-center'
              : 'px-[12px] border-t border-newColColor text-textColor'
          )}
        >
          {!mediaNotAvailable && (
            <div
              className={clsx(
                'flex b2 items-center gap-[4px]',
                !ghost && 'py-[10px]'
              )}
            >
              <div
                // The media picker opens from here and nowhere else, so the
                // screenshot tool needs a handle on it. The icons inside it had
                // never been seen for exactly this reason.
                data-pq="insert-media"
                onClick={showModal}
                className={clsx(
                  'cursor-pointer h-[30px] justify-center items-center flex',
                  ghost
                    ? 'rounded-[8px] px-[10px] text-pqSoft hover:bg-pqHover hover:text-pqText'
                    : 'rounded-[6px] bg-newColColor px-[8px]'
                )}
              >
                <div className="flex gap-[8px] items-center">
                  <div>
                    <InsertMediaIcon />
                  </div>
                  <div
                    className={clsx(
                      'font-[600]',
                      ghost
                        ? 'text-[12px] whitespace-nowrap'
                        : 'text-[10px] maxMedia:hidden block'
                    )}
                  >
                    {t('insert_media', 'Insert media')}
                  </div>
                </div>
              </div>
              <div
                onClick={designMedia}
                className={clsx(
                  'cursor-pointer h-[30px] justify-center items-center flex',
                  ghost
                    ? 'rounded-[8px] px-[10px] text-pqSoft hover:bg-pqHover hover:text-pqText'
                    : 'rounded-[6px] bg-newColColor px-[8px]'
                )}
              >
                <div className="flex gap-[5px] items-center">
                  <div>
                    <DesignMediaIcon />
                  </div>
                  <div
                    className={clsx(
                      'font-[600]',
                      ghost
                        ? 'text-[12px] whitespace-nowrap'
                        : 'text-[10px] iconBreak:hidden block'
                    )}
                  >
                    {t('design_media', 'Design Media')}
                  </div>
                </div>
              </div>

              <ThirdPartyMedia allData={allData} onChange={changeMedia} />

              {!!user?.tier?.ai && (
                <>
                  <AiImage ghost={ghost} value={text} onChange={changeMedia} />
                  <AiVideo ghost={ghost} value={text} onChange={changeMedia} />
                </>
              )}
            </div>
          )}
          {!mediaNotAvailable && (!!toolBar || !!information) && (
            <div className="text-newColColor h-full flex items-center">
              <VerticalDividerIcon />
            </div>
          )}
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
      {showToolbar && <div className="text-[12px] text-red-400">{error}</div>}
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
  const [currentMedia, setCurrentMedia] = useState(value);
  const modals = useModals();
  const mediaDirectory = useMediaDirectory();

  const showDesignModal = useCallback(() => {
    modals.openModal({
      title: t('media_editor', 'Media Editor'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      children: (close) => (
        <Polonto
          width={width}
          height={height}
          setMedia={changeMedia}
          closeModal={close}
        />
      ),
    });
  }, [t]);
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
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      children: (close) => (
        <MediaBox setMedia={changeMedia} closeModal={close} type={type} />
      ),
    });
  }, [t]);
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
      <div className="text-[14px] text-pqMuted">{label}</div>
      <div className="text-[12px] text-pqSoft">{description}</div>
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
