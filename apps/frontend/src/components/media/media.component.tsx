'use client';

import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
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
import { AiVideo } from '@gitroom/frontend/components/launches/ai.video';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { useFeatureSetupHint } from '@gitroom/frontend/components/media/feature.setup.hint';
import {
  InsertMediaIcon,
  DesignMediaIcon,
} from '@gitroom/frontend/components/ui/icons';

const Polonto = dynamic(
  () => import('@gitroom/frontend/components/launches/polonto')
);
const showModalEmitter = new EventEmitter();

export { Pagination } from '@gitroom/frontend/components/media/media.pagination';
import {
  MediaBox,
  MEDIA_LIBRARY_PICKER_HEIGHT,
} from '@gitroom/frontend/components/media/media.box';
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
  // Attach-only fields drop Integrations and the AI generators, leaving the
  // media buttons. Set on media inputs that live *inside* a generator form —
  // the VEO3 images field would otherwise offer "Generate video" and an
  // Integrations modal stacked on the video modal it is already inside.
  // (Those fields also pass `dummy`, which makes Design Media a no-op, so what
  // remains there in practice is Insert media.)
  attachmentsOnly?: boolean;
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
    attachmentsOnly,
    toolBar,
    information,
    mediaNotAvailable,
  } = props;
  const showThumbs = !ghost || ghostPart === 'all' || ghostPart === 'thumbs';
  const showToolbar = !ghost || ghostPart === 'all' || ghostPart === 'toolbar';

  // Ghost mode never hides a label, which was fine for four buttons and wraps
  // with five. The constraint is the *column*, not the window — the agent
  // composer is squeezed between two 264px rails, so it is ~564px wide at a
  // 1440px viewport and widens the moment the chats rail is unpinned, with no
  // viewport change at all. That rules out the `iconBreak`/`maxMedia` viewport
  // queries the filled toolbar uses (untouched, they are right for it) and
  // leaves measuring the row.
  //
  // What it measures is the width the labelled row *needs*, cached while the
  // labels are still up, rather than a constant: five English labels want
  // 635px and translations move that (`Görsel oluştur`, `Entegrasyonlar`…).
  // Caching is also what stops the flip-flop — once compact, the buttons are
  // narrow, so re-measuring them would say there is room, unhide the labels,
  // and wrap again.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const naturalWidth = useRef(0);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const node = toolbarRef.current;
    if (!ghost || !node || typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = (available: number) => {
      const row = node.firstElementChild;
      if (!row) {
        return;
      }
      setCompact((wasCompact) => {
        if (!wasCompact) {
          const kids = Array.from(row.children);
          const gap = 6;
          naturalWidth.current =
            kids.reduce((sum, k) => sum + k.getBoundingClientRect().width, 0) +
            gap * Math.max(0, kids.length - 1);
        }
        return available < naturalWidth.current;
      });
    };
    const observer = new ResizeObserver(([entry]) =>
      measure(entry.contentRect.width)
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ghost, showToolbar]);

  // Non-ghost keeps its viewport breakpoints; ghost uses the measurement.
  const hideLabel = ghost ? compact : undefined;
  const user = useUser();
  const modals = useModals();
  const t = useT();
  const { touch } = useViewport();
  const { billingEnabled, plontoKey, aiEnabled } = useVariables();
  const setupHint = useFeatureSetupHint();
  // The hosted service hides what it has no key for. A self-hosted instance
  // keeps the button and explains how to switch it on (FeatureSetupHint).
  const showDesign = !billingEnabled || !!plontoKey;
  const showAiImage = !billingEnabled || aiEnabled;
  useEffect(() => {
    setCurrentMedia(value);
  }, [value]);

  const [currentMedia, setCurrentMedia] = useState(value);
  // The attachment list, readable without re-creating `changeMedia`.
  //
  // `new-modal.tsx` builds a modal's children once, at open time, so whatever
  // `changeMedia` the AI generators captured then is the one that runs when
  // their request lands — minutes later. Closing over `currentMedia` meant that
  // callback appended to the list as it was at click time: anything added with
  // Insert media while the generation ran was wiped when it finished.
  //
  // Synced in an effect rather than during render: a render React throws away
  // (transition, Offscreen, StrictMode's double invoke) would otherwise still
  // publish its list to a callback that outlives it.
  const currentMediaRef = useRef(currentMedia);
  useEffect(() => {
    currentMediaRef.current = currentMedia;
  }, [currentMedia]);

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
      const existing = currentMediaRef.current || [];
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
    [name, onChange]
  );
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      size: 'min(1200px, calc(100vw - 64px))',
      maxSize: 'min(1200px, calc(100vw - 64px))',
      height: touch ? '100%' : MEDIA_LIBRARY_PICKER_HEIGHT,
      children: (close) => (
        <MediaBox
          setMedia={changeMedia}
          closeModal={close}
          attachedMedia={currentMedia || []}
        />
      ),
    });
  }, [changeMedia, currentMedia, modals, t, touch]);

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
    if (!plontoKey) {
      setupHint(
        t('design_media', 'Design Media'),
        'NEXT_PUBLIC_POLOTNO',
        'https://docs.postqueen.ai/configuration/polotno'
      );
      return;
    }
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
    // `user` and `dummy` are read inside, and `changeMedia` no longer changes
    // identity with the media list, so they have to be declared here or this
    // callback keeps its first-render capture of the tier gate.
  }, [changeMedia, user, dummy, modals, t, plontoKey, setupHint]);

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
              'flex overflow-visible',
              ghost
                ? 'flex-wrap gap-[7px] pb-[3px] pe-[6px] pt-[6px]'
                : 'gap-[10px] px-[12px] pe-[18px] pt-[8px]'
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
                  'sortable-container flex overflow-visible',
                  ghost ? 'flex-wrap gap-[7px]' : 'gap-[10px]'
                )}
                animation={200}
                swap={true}
                handle=".dragging"
                filter={'[data-ci-actions="1"]'}
                preventOnFilter={true}
              >
                {currentMedia.map((media, index) => (
                  <div
                    key={`${media.id}-${index}`}
                    className={clsx(
                      'group relative overflow-visible transition-[box-shadow]',
                      ghost
                        ? 'dragging h-[58px] w-[58px] cursor-move rounded-[9px] bg-pqSettings shadow-[inset_0_0_0_1px_var(--border)]'
                        : 'dragging h-[48px] w-[48px] cursor-move rounded-[8px] bg-pqSettings shadow-[inset_0_0_0_1px_var(--border)] hover:shadow-[inset_0_0_0_1px_var(--brand)]'
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

                    {/* 48px cannot hold overlay chips. Drag the thumb; remove hangs off the corner. */}
                    <button
                      type="button"
                      data-ci-actions="1"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearMedia(index)();
                      }}
                      aria-label={t('remove', 'Remove')}
                      title={t('remove', 'Remove')}
                      className={clsx(
                        'absolute -end-[6px] -top-[6px] z-[20] grid size-[16px] cursor-pointer place-items-center rounded-full bg-pqPop text-pqMuted shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_0_0_1px_var(--border)] hover:bg-pqDanger hover:text-pqOnBrand',
                        !ghost &&
                          !touch &&
                          'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
                      )}
                    >
                      <svg
                        viewBox="0 0 12 12"
                        width="8"
                        height="8"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 3l6 6M9 3L3 9"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </ReactSortable>
            )}
          </div>
        )}
        {showToolbar && (
          <div
            ref={toolbarRef}
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
                  // Icon-only needs the name somewhere, or the row turns into
                  // five unlabelled glyphs for a screen reader.
                  aria-label={t('insert_media', 'Insert media')}
                  title={t('insert_media', 'Insert media')}
                  className={clsx(
                    'inline-flex h-[36px] cursor-pointer items-center justify-center gap-[8px] font-[600]',
                    ghost
                      ? 'rounded-[8px] px-[10px] text-[12px] text-pqSoft hover:bg-pqHover hover:text-pqText'
                      : 'rounded-[8px] bg-pqBtnSimple px-[12px] text-[12px] text-pqText transition-colors hover:bg-pqHover'
                  )}
                >
                  <InsertMediaIcon />
                  <span
                    className={clsx(
                      !ghost && 'maxMedia:hidden',
                      hideLabel && 'hidden'
                    )}
                  >
                    {t('insert_media', 'Insert media')}
                  </span>
                </button>
                {showDesign && (
                <button
                  type="button"
                  onClick={designMedia}
                  aria-label={t('design_media', 'Design Media')}
                  title={t('design_media', 'Design Media')}
                  className={clsx(
                    'inline-flex h-[36px] cursor-pointer items-center justify-center gap-[6px] font-[600]',
                    ghost
                      ? 'rounded-[8px] px-[10px] text-[12px] text-pqSoft hover:bg-pqHover hover:text-pqText'
                      : 'rounded-[8px] bg-pqBtnSimple px-[12px] text-[12px] text-pqText transition-colors hover:bg-pqHover'
                  )}
                >
                  <DesignMediaIcon />
                  <span
                    className={clsx(
                      !ghost && 'iconBreak:hidden',
                      hideLabel && 'hidden'
                    )}
                  >
                    {t('design_media', 'Design Media')}
                  </span>
                </button>
                )}

                {!attachmentsOnly && (
                  <>
                    <ThirdPartyMedia
                      ghost={ghost}
                      compact={compact}
                      allData={allData}
                      onChange={changeMedia}
                    />

                    {!!user?.tier?.ai && (
                      <>
                        {showAiImage && (
                          <AiImage
                            ghost={ghost}
                            compact={compact}
                            value={text}
                            onChange={changeMedia}
                          />
                        )}
                        <AiVideo
                          ghost={ghost}
                          compact={compact}
                          value={text}
                          onChange={changeMedia}
                        />
                      </>
                    )}
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
  const { touch } = useViewport();

  const { name, type, label, description, onChange, value, width, height } =
    props;
  const { billingEnabled, plontoKey } = useVariables();
  const setupHint = useFeatureSetupHint();
  // Same rule as Design Media above.
  const showDesign = !billingEnabled || !!plontoKey;
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
    if (!plontoKey) {
      setupHint(
        t('media_editor', 'Media Editor'),
        'NEXT_PUBLIC_POLOTNO',
        'https://docs.postqueen.ai/configuration/polotno'
      );
      return;
    }
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
  }, [t, width, height, changeMedia, modals, plontoKey, setupHint]);
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      size: 'min(1200px, calc(100vw - 64px))',
      maxSize: 'min(1200px, calc(100vw - 64px))',
      height: touch ? '100%' : MEDIA_LIBRARY_PICKER_HEIGHT,
      children: (close) => (
        <MediaBox
          setMedia={changeMedia}
          closeModal={close}
          type={type}
          attachedMedia={currentMedia ? [currentMedia] : []}
        />
      ),
    });
  }, [t, changeMedia, type, currentMedia, touch]);
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
        {showDesign && (
          <Button onClick={showDesignModal} className="!bg-customColor45">
            {t('editor', 'Editor')}
          </Button>
        )}
        <Button secondary={true} onClick={clearMedia}>
          {t('clear', 'Clear')}
        </Button>
      </div>
    </div>
  );
};
