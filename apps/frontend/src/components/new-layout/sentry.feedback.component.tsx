'use client';

import { FC, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const AttachToFeedbackIcon: FC = () => {
  const { sentryDsn } = useVariables();
  const [feedback, setFeedback] = useState<any>();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!sentryDsn) return;
    try {
      const fb = (Sentry as any).getFeedback?.();
      setFeedback(fb);
    } catch (e) {
      setFeedback(undefined);
    }
  }, [sentryDsn]);

  useEffect(() => {
    if (feedback && buttonRef.current) {
      const unsubscribe = feedback.attachTo(buttonRef.current);
      return unsubscribe;
    }
    return () => {};
  }, [feedback]);

  if (!sentryDsn) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Feedback"
      className="hover:text-newTextColor"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M27 10H23V6C23 5.46957 22.7893 4.96086 22.4142 4.58579C22.0391 4.21071 21.5304 4 21 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V22C3.00059 22.1881 3.05423 22.3723 3.15478 22.5313C3.25532 22.6903 3.39868 22.8177 3.56839 22.8989C3.7381 22.9801 3.92728 23.0118 4.11418 22.9903C4.30108 22.9689 4.47814 22.8951 4.625 22.7775L9 19.25V23C9 23.5304 9.21071 24.0391 9.58579 24.4142C9.96086 24.7893 10.4696 25 11 25H22.6987L27.375 28.7775C27.5519 28.9206 27.7724 28.9991 28 29C28.2652 29 28.5196 28.8946 28.7071 28.7071C28.8946 28.5196 29 28.2652 29 28V12C29 11.4696 28.7893 10.9609 28.4142 10.5858C28.0391 10.2107 27.5304 10 27 10ZM8.31875 17.2225L5 19.9062V6H21V17H8.9475C8.71863 17 8.4967 17.0786 8.31875 17.2225ZM27 25.9062L23.6812 23.2225C23.5043 23.0794 23.2838 23.0009 23.0562 23H11V19H21C21.5304 19 22.0391 18.7893 22.4142 18.4142C22.7893 18.0391 23 17.5304 23 17V12H27V25.9062Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};
