import { ReactNode } from 'react';
import { continuePickerItemClasses } from './continue-picker-meta';

export { continuePickerHandle } from '@gitroom/frontend/components/channels/channel-handle';

export {
  CONTINUE_PICKER_AVATAR_ATTR,
  continuePickerInitial,
  continuePickerItemClasses,
  joinContinuePickerMeta,
} from './continue-picker-meta';

export function ContinuePickerItem({
  pictureUrl,
  name,
  meta,
  fallback,
}: {
  pictureUrl?: string;
  name: string;
  meta?: string;
  fallback: ReactNode;
}) {
  const src = pictureUrl?.trim();

  return (
    <>
      {src ? (
        <img data-avatar="" src={src} alt="" />
      ) : (
        <div data-avatar="" className={continuePickerItemClasses.fallback}>
          {fallback}
        </div>
      )}
      <span className={continuePickerItemClasses.text}>
        <span className={continuePickerItemClasses.name}>{name}</span>
        {meta ? (
          <span className={continuePickerItemClasses.meta}>{meta}</span>
        ) : null}
      </span>
    </>
  );
}
