'use client';
import ReactLoading from 'react-loading';

export const LoadingComponent = () => {
  return <div className="flex-1 flex justify-center pt-[100px]"><ReactLoading type="spin" color="#fff" width={100} height={100} /></div>;
};

