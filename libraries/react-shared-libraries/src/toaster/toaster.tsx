'use client';

import { useCallback, useEffect, useState } from 'react';
import EventEmitter from 'events';
import clsx from 'clsx';
const toaster = new EventEmitter();
export const Toaster = () => {
  const [showToaster, setShowToaster] = useState(false);
  const [toasterText, setToasterText] = useState('');
  const [toasterType, setToasterType] = useState<'success' | 'warning' | ''>(
    ''
  );
  useEffect(() => {
    toaster.on(
      'show',
      (params: { text: string; type?: 'success' | 'warning' }) => {
        const { text, type } = params;
        setToasterText(text);
        setToasterType(type || 'success');
        setShowToaster(true);
        setTimeout(() => {
          setShowToaster(false);
        }, 4200);
      }
    );
    return () => {
      toaster.removeAllListeners();
    };
  }, []);
  if (!showToaster) {
    return <></>;
  }
  return (
    <div
      className={clsx(
        'animate-fadeDown rounded-[8px] gap-[18px] flex items-center overflow-hidden bg-customColor8 p-[16px] min-w-[319px] fixed start-[50%] text-white z-[900] top-[32px] -translate-x-[50%] h-[56px]',
        toasterType === 'success' ? 'shadow-greenToast' : 'shadow-yellowToast'
      )}
    >
      <div>
        {toasterType === 'success' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2.25C10.0716 2.25 8.18657 2.82183 6.58319 3.89317C4.97982 4.96452 3.73013 6.48726 2.99218 8.26884C2.25422 10.0504 2.06114 12.0108 2.43735 13.9021C2.81355 15.7934 3.74215 17.5307 5.10571 18.8943C6.46928 20.2579 8.20656 21.1865 10.0979 21.5627C11.9892 21.9389 13.9496 21.7458 15.7312 21.0078C17.5127 20.2699 19.0355 19.0202 20.1068 17.4168C21.1782 15.8134 21.75 13.9284 21.75 12C21.7473 9.41498 20.7192 6.93661 18.8913 5.10872C17.0634 3.28084 14.585 2.25273 12 2.25ZM16.2806 10.2806L11.0306 15.5306C10.961 15.6004 10.8783 15.6557 10.7872 15.6934C10.6962 15.7312 10.5986 15.7506 10.5 15.7506C10.4014 15.7506 10.3038 15.7312 10.2128 15.6934C10.1218 15.6557 10.039 15.6004 9.96938 15.5306L7.71938 13.2806C7.57865 13.1399 7.49959 12.949 7.49959 12.75C7.49959 12.551 7.57865 12.3601 7.71938 12.2194C7.86011 12.0786 8.05098 11.9996 8.25 11.9996C8.44903 11.9996 8.6399 12.0786 8.78063 12.2194L10.5 13.9397L15.2194 9.21937C15.2891 9.14969 15.3718 9.09442 15.4628 9.0567C15.5539 9.01899 15.6515 8.99958 15.75 8.99958C15.8486 8.99958 15.9461 9.01899 16.0372 9.0567C16.1282 9.09442 16.2109 9.14969 16.2806 9.21937C16.3503 9.28906 16.4056 9.37178 16.4433 9.46283C16.481 9.55387 16.5004 9.65145 16.5004 9.75C16.5004 9.84855 16.481 9.94613 16.4433 10.0372C16.4056 10.1282 16.3503 10.2109 16.2806 10.2806Z"
              fill="#6CE9A6"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M22.201 17.6334L14.0026 3.39556C13.7977 3.04674 13.5052 2.75752 13.1541 2.55656C12.803 2.3556 12.4055 2.24988 12.001 2.24988C11.5965 2.24988 11.199 2.3556 10.8479 2.55656C10.4968 2.75752 10.2043 3.04674 9.99944 3.39556L1.80101 17.6334C1.60388 17.9708 1.5 18.3545 1.5 18.7453C1.5 19.136 1.60388 19.5197 1.80101 19.8571C2.00325 20.2081 2.29523 20.4989 2.64697 20.6997C2.99871 20.9005 3.39755 21.0041 3.80257 20.9999H20.1994C20.6041 21.0038 21.0026 20.9 21.354 20.6992C21.7054 20.4984 21.997 20.2078 22.1991 19.8571C22.3965 19.5199 22.5007 19.1363 22.5011 18.7455C22.5014 18.3548 22.3978 17.9709 22.201 17.6334ZM11.251 9.74994C11.251 9.55103 11.33 9.36026 11.4707 9.21961C11.6113 9.07896 11.8021 8.99994 12.001 8.99994C12.1999 8.99994 12.3907 9.07896 12.5313 9.21961C12.672 9.36026 12.751 9.55103 12.751 9.74994V13.4999C12.751 13.6989 12.672 13.8896 12.5313 14.0303C12.3907 14.1709 12.1999 14.2499 12.001 14.2499C11.8021 14.2499 11.6113 14.1709 11.4707 14.0303C11.33 13.8896 11.251 13.6989 11.251 13.4999V9.74994ZM12.001 17.9999C11.7785 17.9999 11.561 17.934 11.376 17.8103C11.191 17.6867 11.0468 17.511 10.9616 17.3055C10.8765 17.0999 10.8542 16.8737 10.8976 16.6555C10.941 16.4372 11.0482 16.2368 11.2055 16.0794C11.3628 15.9221 11.5633 15.815 11.7815 15.7716C11.9998 15.7281 12.226 15.7504 12.4315 15.8356C12.6371 15.9207 12.8128 16.0649 12.9364 16.2499C13.06 16.4349 13.126 16.6524 13.126 16.8749C13.126 17.1733 13.0075 17.4595 12.7965 17.6704C12.5855 17.8814 12.2994 17.9999 12.001 17.9999Z"
              fill="#FEC84B"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 text-textColor">{toasterText}</div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="60"
        height="56"
        viewBox="0 0 60 56"
        fill="none"
        className="absolute top-0 start-0"
      >
        <g filter="url(#filter0_f_376_2968)">
          <ellipse
            cx="-12"
            cy="28"
            rx="28"
            ry="13"
            fill={toasterType === 'success' ? '#6CE9A6' : '#FEC84B'}
          />
        </g>
        <defs>
          <filter
            id="filter0_f_376_2968"
            x="-84"
            y="-29"
            width="144"
            height="114"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="22"
              result="effect1_foregroundBlur_376_2968"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
export const useToaster = () => {
  return {
    show: useCallback((text: string, type?: 'success' | 'warning') => {
      toaster.emit('show', {
        text,
        type,
      });
    }, []),
  };
};
