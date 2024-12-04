import { useFetch } from "@gitroom/helpers/utils/custom.fetch";
import { useMediaDirectory } from "@gitroom/react/helpers/use.media.directory";
import { FC, useCallback, useEffect, useState } from "react";
import { Media } from '@prisma/client';
import useSWR from "swr";
import { TopTitle } from "../launches/helpers/top.title.component";
import { MultipartFileUploader } from "./new.uploader";
import clsx from "clsx";
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import Image from "next/image";

export const MediaBox: FC<{
    setMedia: (params: { id: string; path: string }) => void;
    type?: 'image' | 'video';
    closeModal: () => void;
  }> = (props) => {
    const { setMedia, type, closeModal } = props;
    const [mediaList, setListMedia] = useState<Media[]>([]);
    const fetch = useFetch();
    const mediaDirectory = useMediaDirectory();
  
    const loadMedia = useCallback(async () => {
      return (await fetch('/media')).json();
    }, [fetch]);
  
    const setNewMedia = useCallback(
      (media: Media) => () => {
        setMedia(media);
        closeModal();
      },
      [closeModal]
    );
  
    const { data, mutate } = useSWR('get-media', loadMedia);
  
    useEffect(() => {
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
              <svg
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
              >
                <path
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
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
                    <Image
                      className="w-full h-full object-cover"
                      src={mediaDirectory.set(media.path)}
                      alt='media'
                      width={30}
                      height={30}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };