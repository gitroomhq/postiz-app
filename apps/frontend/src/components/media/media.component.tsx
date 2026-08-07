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
  InsertMediaIcon,
  DesignMediaIcon,
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
  callback: (params: { id: string; path: string }[]) => void
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
    setCurrentMedia(value);
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
      const existing = currentMedia || [];
      const seen = new Set(existing.map((x) => x.id));
      const additions = mediaArray.filter((x) => x?.id && !seen.has(x.id));
      if (additions.length === 0) {
        return;
      }
      const newMedia = [...existing, ...additions];
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia, name, onChange]
  );
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      size: 'min(1200px, calc(100vw - 64px))',
      maxSize: 'min(1200px, calc(100vw - 64px))',
      children: (close) => (
        <MediaBox
          setMedia={changeMedia}
          closeModal={close}
          attachedMedia={currentMedia || []}
        />
      ),
    });
  }, [changeMedia, currentMedia, t]);

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
    [currentMedia, name, onChange]
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
                setList={(next) => {
                  setCurrentMedia(next);
                  onChange({ target: { name, value: next } });
                }}
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
                    key={`${media.id}-${index}`}
                    className={clsx(
                      'group relative overflow-hidden transition-[box-shadow]',
                      ghost
                        ? 'dragging h-[58px] w-[58px] cursor-move rounded-[9px] bg-pqSettings shadow-[inset_0_0_0_1px_var(--border)]'
                        : 'h-[48px] w-[48px] cursor-pointer rounded-[8px] bg-pqSettings shadow-[inset_0_0_0_1px_var(--border)] hover:shadow-[inset_0_0_0_1px_var(--brand)]'
                    )}
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
                      {hasExtension(media?.path, 'mp4') ? (
                        <VideoFrame url={mediaDirectory.set(media?.path)} />
                      ) : (
                        <img
                          className="h-full w-full object-cover"
                          src={mediaDirectory.set(media?.path)}
                          alt=""
                        />
                      )}
                    </div>

                    {!ghost && (
                      <>
                        <button
                          type="button"
                          data-ci-actions="1"
                          aria-label={t('reorder_media', 'Reorder')}
                          title={t('reorder_media', 'Reorder')}
                          className="dragging absolute start-[4px] top-[4px] z-[20] grid h-[18px] w-[18px] cursor-move place-items-center rounded-[5px] bg-pqPop text-pqMuted opacity-0 shadow-[inset_0_0_0_1px_var(--border)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-pqText"
                        >
                          <svg
                            viewBox="0 0 12 12"
                            width="10"
                            height="10"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <circle cx="3.5" cy="3.5" r="1.1" />
                            <circle cx="8.5" cy="3.5" r="1.1" />
                            <circle cx="3.5" cy="8.5" r="1.1" />
                            <circle cx="8.5" cy="8.5" r="1.1" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          data-ci-actions="1"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearMedia(index)();
                          }}
                          aria-label={t('remove', 'Remove')}
                          title={t('remove', 'Remove')}
                          className="absolute end-[4px] top-[4px] z-[20] grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-pqPop text-pqMuted opacity-0 shadow-[inset_0_0_0_1px_var(--border)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-pqDangerChip hover:text-pqDanger"
                        >
                          <svg
                            viewBox="0 0 12 12"
                            width="9"
                            height="9"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M3 3l6 6M9 3L3 9"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>

                        <button
                          type="button"
                          data-ci-actions="1"
                          onClick={() => {
                            modals.openModal({
                              title: t('change_alt_text', 'Change alt text'),
                              children: (close) => (
                                <MediaComponentInner
                                  media={media as any}
                                  onClose={close}
                                  onSelect={(next: any) => {
                                    const updated = currentMedia.map((p) => {
                                      if (p.id === media.id) {
                                        return {
                                          ...p,
                                          ...next,
                                        };
                                      }
                                      return p;
                                    });
                                    setCurrentMedia(updated);
                                    onChange({
                                      target: {
                                        name,
                                        value: updated,
                                      },
                                    });
                                  }}
                                />
                              ),
                            });
                          }}
                          aria-label={t('media_settings', 'Media settings')}
                          title={t('media_settings', 'Media settings')}
                          className="absolute bottom-[4px] left-1/2 z-[20] grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-[5px] bg-pqPop text-pqMuted opacity-0 shadow-[inset_0_0_0_1px_var(--border)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-pqText"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            width="11"
                            height="11"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <path
                              d="M8 2.5v1.2M8 12.3v1.2M2.5 8h1.2M12.3 8h1.2M4.1 4.1l.85.85M11.05 11.05l.85.85M11.9 4.1l-.85.85M4.95 11.05l-.85.85"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </>
                    )}

                    {ghost && (
                      <button
                        type="button"
                        onClick={clearMedia(index)}
                        aria-label={t('remove', 'Remove')}
                        className="absolute -end-[5px] -top-[5px] z-[20] grid h-[17px] w-[17px] place-items-center rounded-full bg-pqWarn text-[10px] font-[700] leading-none text-pqOnBrand"
                      >
                        ×
                      </button>
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
            'flex w-full flex-wrap items-center gap-x-[10px] gap-y-[8px] b1',
            ghost
              ? 'items-center'
              : 'border-t border-pqLine px-[12px] py-[10px] text-pqText'
          )}
        >
          {!mediaNotAvailable && (
            <div className="flex flex-wrap items-center gap-[6px]">
              <button
                type="button"
                // The media picker opens from here and nowhere else, so the
                // screenshot tool needs a handle on it. The icons inside it had
                // never been seen for exactly this reason.
                data-pq="insert-media"
                onClick={showModal}
                className={clsx(
                  'inline-flex h-[36px] cursor-pointer items-center justify-center gap-[8px] font-[600]',
                  ghost
                    ? 'rounded-[8px] px-[10px] text-[12px] text-pqSoft hover:bg-pqHover hover:text-pqText'
                    : 'rounded-[8px] bg-pqBtnSimple px-[12px] text-[12px] text-pqText transition-colors hover:bg-pqHover'
                )}
              >
                <InsertMediaIcon />
                <span className={clsx(!ghost && 'maxMedia:hidden')}>
                  {t('insert_media', 'Insert media')}
                </span>
              </button>
              <button
                type="button"
                onClick={designMedia}
                className={clsx(
                  'inline-flex h-[36px] cursor-pointer items-center justify-center gap-[6px] font-[600]',
                  ghost
                    ? 'rounded-[8px] px-[10px] text-[12px] text-pqSoft hover:bg-pqHover hover:text-pqText'
                    : 'rounded-[8px] bg-pqBtnSimple px-[12px] text-[12px] text-pqText transition-colors hover:bg-pqHover'
                )}
              >
                <DesignMediaIcon />
                <span className={clsx(!ghost && 'iconBreak:hidden')}>
                  {t('design_media', 'Design Media')}
                </span>
              </button>

              <ThirdPartyMedia
                ghost={ghost}
                allData={allData}
                onChange={changeMedia}
              />

              {!!user?.tier?.ai && (
                <>
                  <AiImage ghost={ghost} value={text} onChange={changeMedia} />
                  <AiVideo ghost={ghost} value={text} onChange={changeMedia} />
                </>
              )}
            </div>
          )}
          {!mediaNotAvailable && (!!toolBar || !!information) && (
            <div
              className="hidden h-[22px] w-px shrink-0 self-center bg-pqLine sm:block"
              aria-hidden="true"
            />
          )}
          {!!toolBar && (
            <div className="flex flex-wrap items-center gap-[6px]">
              {toolBar}
            </div>
          )}
          {information && (
            <div className="ms-auto flex items-center gap-[4px]">
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
  const [currentMedia, setCurrentMedia] = useState(value);
  useEffect(() => {
    setCurrentMedia(value);
  }, [value]);
  const modals = useModals();
  const mediaDirectory = useMediaDirectory();

  const changeMedia = useCallback(
    (m: { path: string; id: string }[]) => {
      const next = m[0];
      setCurrentMedia(next);
      onChange({
        target: {
          name,
          value: next,
        },
      });
    },
    [name, onChange]
  );
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
  }, [t, width, height, changeMedia, modals]);
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      size: 'min(1200px, calc(100vw - 64px))',
      maxSize: 'min(1200px, calc(100vw - 64px))',
      children: (close) => (
        <MediaBox
          setMedia={changeMedia}
          closeModal={close}
          type={type}
          attachedMedia={currentMedia ? [currentMedia] : []}
        />
      ),
    });
  }, [t, changeMedia, type, currentMedia]);
  const clearMedia = useCallback(() => {
    setCurrentMedia(undefined);
    onChange({
      target: {
        name,
        value: undefined,
      },
    });
  }, [name, onChange]);
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="text-[14px] text-pqMuted">{label}</div>
      <div className="text-[12px] text-pqSoft">{description}</div>
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
