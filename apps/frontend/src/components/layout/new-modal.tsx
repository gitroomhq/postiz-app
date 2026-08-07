import { create } from 'zustand';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { useShallow } from 'zustand/react/shallow';
import React, {
  createContext,
  FC,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import clsx from 'clsx';
import { EventEmitter } from 'events';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface OpenModalInterface {
  title?: any;
  closeOnClickOutside?: boolean;
  removeLayout?: boolean;
  fullScreen?: boolean;
  top?: string | number;
  closeOnEscape?: boolean;
  withCloseButton?: boolean;
  askClose?: boolean;
  onClose?: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
  classNames?: {
    modal?: string;
  };
  size?: string | number;
  maxSize?: string | number;
  height?: string | number;
  id?: string;
}

interface ModalManagerStoreInterface {
  closeById(id: string): void;
  openModal(params: OpenModalInterface): void;
  closeAll(): void;
}

interface State extends ModalManagerStoreInterface {
  modalManager: Array<{ id: string } & OpenModalInterface>;
}

const useModalStore = create<State>((set) => ({
  modalManager: [],
  openModal: (params) => {
    const newId = params.id || makeId(20);
    set((state) => ({
      modalManager: [
        ...state.modalManager,
        ...(!state.modalManager.some((p) => p.id === newId)
          ? [{ id: newId, ...params }]
          : []),
      ],
    }));
  },
  closeById: (id) =>
    set((state) => ({
      modalManager: state.modalManager.filter((modal) => modal.id !== id),
    })),
  closeAll: () => set({ modalManager: [] }),
}));

const CurrentModalContext = createContext({ id: '' });

interface ModalManagerInterface extends ModalManagerStoreInterface {
  closeCurrent(): void;
}

export const useModals = () => {
  const { closeAll, openModal, closeById } = useModalStore(
    useShallow((state) => ({
      openModal: state.openModal,
      closeById: state.closeById,
      closeAll: state.closeAll,
    }))
  );

  const modalContext = useContext(CurrentModalContext);

  return {
    openModal,
    closeAll,
    closeById,
    closeCurrent: () => {
      if (modalContext.id) {
        closeById(modalContext.id);
      }
    },
  } satisfies ModalManagerInterface;
};

export const Component: FC<{
  closeModal: (id: string) => void;
  zIndex: number;
  isLast: boolean;
  modal: { id: string } & OpenModalInterface;
}> = memo(({ isLast, modal, closeModal, zIndex }) => {
  const t = useT();
  const decision = useDecisionModal();
  const closeModalFunction = useCallback(async () => {
    if (modal.askClose) {
      const open = await decision.open({
        description: t(
          'are_you_sure_you_want_to_close_this_modal_all_data_will_be_lost',
          'Are you sure you want to close this modal? (all data will be lost)'
        ),
        approveLabel: t('yes_close_it', 'Yes, close it!'),
        cancelLabel: t('no_cancel', 'No, cancel!'),
        danger: false,
      });
      if (!open) {
        return;
      }
    }
    modal?.onClose?.();
    closeModal(modal.id);
  }, [modal.id, closeModal, modal.askClose, modal.onClose, decision, t]);

  const RenderComponent = useMemo(() => {
    return typeof modal.children === 'function'
      ? modal.children(closeModalFunction)
      : modal.children;
  }, [modal, closeModalFunction]);

  useHotkeys(
    'Escape',
    () => {
      if (isLast) {
        closeModalFunction();
      }
    },
    [isLast, closeModalFunction]
  );

  if (modal.removeLayout) {
    return (
      <div
        style={{ zIndex }}
        className={clsx(
          !modal.fullScreen
            ? 'pb-[50px] min-w-full min-h-full'
            : 'w-full h-full',
          'fixed flex left-0 top-0 bg-popup transition-all animate-fadeIn overflow-y-auto text-newTextColor',
          !isLast && '!overflow-hidden'
        )}
      >
        <div className={clsx(modal.fullScreen && 'flex', 'relative flex-1')}>
          <div
            className={clsx(
              modal.fullScreen
                ? 'flex flex-1'
                : 'absolute top-0 left-0 min-w-full min-h-full'
            )}
          >
            <div
              className={clsx(
                modal.fullScreen ? 'w-full h-full flex-1' : 'mx-auto py-[48px]'
              )}
              {...(modal.size && { style: { width: modal.size } })}
            >
              {typeof modal.children === 'function'
                ? modal.children(closeModalFunction)
                : modal.children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CurrentModalContext.Provider value={{ id: modal.id }}>
      <div
        onClick={closeModalFunction}
        style={{ zIndex }}
        className={clsx(
          'fixed flex left-0 top-0 min-w-full min-h-full bg-popup transition-all animate-fadeIn overflow-y-auto text-newTextColor',
          !modal.fullScreen && 'pb-[50px]'
        )}
      >
        <div className="relative flex-1">
          <div
            style={
              modal.top
                ? { paddingTop: modal.top, paddingBottom: modal.top }
                : {}
            }
            className={clsx(
              'absolute min-w-full',
              !modal.fullScreen
                ? modal.top
                  ? ''
                  : 'min-h-full pt-[100px] pb-[100px]'
                : 'h-screen',
              modal.size && modal.height
                ? 'flex justify-center items-center'
                : 'top-0 left-0'
            )}
          >
            <div
              className={clsx(
                !modal.removeLayout && 'gap-[16px] p-[32px]',
                // Prototype form card: --inner, r24, p32, gap16,
                // min-width:min(600px,100%) even when formWidth is 420/460.
                'relative mx-auto flex w-fit max-w-[min(920px,calc(100vw-48px))] flex-col rounded-[24px] bg-pqInner text-pqText shadow-pq',
                !modal.fullScreen && 'min-w-[min(600px,100%)] max-h-[86vh]',
                modal.fullScreen && 'h-full',
                modal.classNames?.modal
              )}
              {...((!!modal.size || !!modal.height || !!modal.maxSize) && {
                style: {
                  // Width can be narrower on paper (420/460) but min-w above
                  // keeps desktop cards ≥600 like the prototype.
                  ...(modal.size
                    ? {
                        width:
                          typeof modal.size === 'number'
                            ? Math.max(modal.size, 600)
                            : modal.size,
                      }
                    : {}),
                  ...(modal.height ? { height: modal.height } : {}),
                  ...(modal.maxSize ? { maxWidth: modal.maxSize } : {}),
                },
              })}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center">
                <div
                  className={clsx(
                    'font-display text-[24px] font-[600] -tracking-[0.015em] flex-1',
                    (typeof modal.withCloseButton === 'undefined' ||
                      modal.withCloseButton) &&
                      'pe-[34px]'
                  )}
                >
                  {modal.title}
                </div>
                {typeof modal.withCloseButton === 'undefined' ||
                modal.withCloseButton ? (
                  <div className="cursor-pointer">
                    <button
                      className="absolute end-[20px] top-[20px] grid size-[30px] place-items-center rounded-[9px] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText cursor-pointer"
                      type="button"
                      onClick={closeModalFunction}
                      aria-label="Close"
                    >
                      <svg
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                      >
                        <path
                          d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>
              <div
                className={clsx(
                  'min-h-0 overflow-y-auto whitespace-pre-line',
                  !!modal.height && !!modal.size && 'flex flex-1 flex-col'
                )}
              >
                {RenderComponent}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CurrentModalContext.Provider>
  );
});

export const ModalManagerInner: FC = () => {
  const { closeModal, modalManager } = useModalStore(
    useShallow((state) => ({
      closeModal: state.closeById,
      modalManager: state.modalManager,
    }))
  );

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (modalManager.length > 0) {
      // Overflow lock only — scrollbar gutter lives on `html` always
      // (global.scss) so Create Post / any modal does not shift the chrome.
      html.classList.add('pq-modal-open');
      body?.classList.add('overflow-hidden');
      // Settings is its own scrim route under `.blurMe` — blurring it under a
      // nested form washes the sheet; prototype keeps Settings sharp.
      const settingsOpen = !!document.querySelector('[data-settings-scrim]');
      if (!settingsOpen) {
        Array.from(document.querySelectorAll('.blurMe') || []).map((p) =>
          p.classList.add('blur-xs', 'pointer-events-none')
        );
      }
    } else {
      html.classList.remove('pq-modal-open');
      body?.classList.remove('overflow-hidden');
      Array.from(document.querySelectorAll('.blurMe') || []).map((p) =>
        p.classList.remove('blur-xs', 'pointer-events-none')
      );
    }
  }, [modalManager]);

  if (modalManager.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`html.pq-modal-open, html.pq-modal-open body { overflow: hidden !important; }`}</style>
      {modalManager.map((modal, index) => (
        <Component
          isLast={modalManager.length - 1 === index}
          key={modal.id}
          modal={modal}
          zIndex={200 + index}
          closeModal={closeModal}
        />
      ))}
    </>
  );
};
export const ModalManager: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div>
      <ModalManagerEmitter />
      <ModalManagerInner />
      <div className="transition-all w-full">{children}</div>
    </div>
  );
};

const emitter = new EventEmitter();
export const showModalEmitter = (params: ModalManagerInterface) => {
  emitter.emit('show', params);
};

export const ModalManagerEmitter: FC = () => {
  const { showModal } = useModalStore(
    useShallow((state) => ({
      showModal: state.openModal,
    }))
  );

  useEffect(() => {
    emitter.on('show', (params: OpenModalInterface) => {
      showModal(params);
    });

    return () => {
      emitter.removeAllListeners('show');
    };
  }, []);
  return null;
};

/**
 * Settings / modal form footer: primary (+ optional secondary) then outline Cancel.
 * Right-aligned; primary should be `shrink-0` with horizontal padding — not `flex-1`
 * (full-bleed brand bars dwarf Cancel — owner feedback 2026-08-06).
 */
export const ModalFormActions: FC<{
  onCancel: () => void;
  cancelLabel?: string;
  children: ReactNode;
}> = ({ onCancel, cancelLabel, children }) => {
  const t = useT();
  return (
    <div className="mt-[2px] flex flex-wrap items-center justify-end gap-[8px] pt-[2px]">
      {children}
      <button
        type="button"
        onClick={onCancel}
        className="h-[40px] w-[110px] shrink-0 rounded-[10px] bg-transparent text-[13.5px] font-[500] text-pqText shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover"
      >
        {cancelLabel ?? t('cancel', 'Cancel')}
      </button>
    </div>
  );
};

/** Shared field chrome for modal forms (prototype overlayVals inputs). */
export const modalFieldClass =
  'h-[44px] w-full rounded-[10px] border-0 bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] transition-shadow placeholder:text-pqSoft focus:shadow-[inset_0_0_0_1px_var(--brand)]';

export const modalTextareaClass =
  'min-h-[110px] w-full resize-y rounded-[10px] border-0 bg-pqTableHeader p-[10px_12px] text-[14px] leading-[1.55] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] transition-shadow placeholder:text-pqSoft focus:shadow-[inset_0_0_0_1px_var(--brand)]';

export const modalLabelClass = 'text-[14px] text-pqMuted';

export const DecisionModal: FC<{
  description: string;
  approveLabel: string;
  cancelLabel: string;
  onlyApprove: boolean;
  danger?: boolean;
  resolution: (value: boolean) => void;
}> = ({
  description,
  cancelLabel,
  approveLabel,
  resolution,
  onlyApprove,
  danger,
}) => {
  const { closeCurrent } = useModals();
  return (
    <div className="flex flex-col">
      <div className="max-w-[600px] whitespace-pre-line text-[14px] leading-[1.6] text-pqMuted">
        {description}
      </div>
      <div className="mt-[20px] flex gap-[10px]">
        <button
          type="button"
          onClick={() => {
            resolution(true);
            closeCurrent();
          }}
          className={clsx(
            'min-w-[112px] h-[46px] px-[24px] rounded-[12px] border-0 text-[14.5px] font-[600] text-pqOnBrand cursor-pointer transition-[filter] hover:brightness-110',
            danger ? 'bg-pqDanger' : 'bg-pqBrand'
          )}
        >
          {approveLabel}
        </button>
        {!onlyApprove && (
          <button
            type="button"
            onClick={() => {
              resolution(false);
              closeCurrent();
            }}
            className="min-w-[112px] h-[46px] px-[24px] rounded-[12px] border-0 bg-pqBtnSimple text-[14.5px] font-[600] text-pqText cursor-pointer transition-shadow hover:shadow-[inset_0_0_0_999px_var(--hover)]"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export const decisionModalEmitter = new EventEmitter();

export const areYouSure = ({
  title = 'Are you sure?',
  description = 'Are you sure you want to close this modal?' as any,
  approveLabel = 'Yes',
  cancelLabel = 'No',
  danger = false,
} = {}): Promise<boolean> => {
  return new Promise<boolean>((newRes) => {
    decisionModalEmitter.emit('open', {
      title,
      description,
      approveLabel,
      cancelLabel,
      danger,
      newRes,
    });
  });
};

export const DecisionEverywhere: FC = () => {
  const decision = useDecisionModal();
  useEffect(() => {
    decisionModalEmitter.on('open', decision.open);
  }, []);
  return null;
};

export const useDecisionModal = () => {
  const modals = useModals();
  const open = useCallback(
    ({
      title = 'Are you sure?',
      description = 'Are you sure you want to close this modal?' as any,
      onlyApprove = false,
      approveLabel = 'Yes',
      cancelLabel = 'No',
      danger = false,
      newRes = undefined as any,
    } = {}) => {
      return new Promise<boolean>((res) => {
        modals.openModal({
          title,
          askClose: false,
          onClose: () => res(false),
          children: (
            <DecisionModal
              onlyApprove={onlyApprove}
              danger={danger}
              resolution={(value) => (newRes ? newRes(value) : res(value))}
              description={description}
              approveLabel={approveLabel}
              cancelLabel={cancelLabel}
            />
          ),
        });
      });
    },
    [modals]
  );

  return { open };
};
