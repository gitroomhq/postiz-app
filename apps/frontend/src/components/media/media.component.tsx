'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import dynamic from 'next/dynamic';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { MediaBox } from './mediabox.component';
const Polonto = dynamic(
  () => import('@gitroom/frontend/components/launches/polonto')
);


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
  const { name, type, label, description, onChange, value, width, height } = props;
  const { getValues } = useSettings();
  const user = useUser();
 
  const [modal, setShowModal] = useState(false);
  const [mediaModal, setMediaModal] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();

  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentMedia(settings);
    }
  }, []);
  
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
