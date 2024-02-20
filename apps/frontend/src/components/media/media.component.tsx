'use client';

import { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Media } from '@prisma/client';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import {useFormState} from "react-hook-form";
import {useSettings} from "@gitroom/frontend/components/launches/helpers/use.values";

export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }) => void;
  closeModal: () => void;
}> = (props) => {
  const { setMedia, closeModal } = props;
  const [pages, setPages] = useState(0);
  const [mediaList, setListMedia] = useState<Media[]>([]);
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();

  const loadMedia = useCallback(async () => {
    return (await fetch('/media')).json();
  }, []);

  const uploadMedia = useCallback(
    async (file: ChangeEvent<HTMLInputElement>) => {
      const maxFileSize = 10 * 1024 * 1024;
      if (
        !file?.target?.files?.length ||
        file?.target?.files?.[0]?.size > maxFileSize
      )
        return;
      const formData = new FormData();
      formData.append('file', file?.target?.files?.[0]);
      const data = await (
        await fetch('/media', {
          method: 'POST',
          body: formData,
        })
      ).json();

      console.log(data);
      setListMedia([...mediaList, data]);
    },
    [mediaList]
  );

  const setNewMedia = useCallback(
    (media: Media) => () => {
      setMedia(media);
      closeModal();
    },
    []
  );

  const { data } = useSWR('get-media', loadMedia);

  useEffect(() => {
    if (data?.pages) {
      setPages(data.pages);
    }
    if (data?.results && data?.results?.length) {
      setListMedia([...data.results]);
    }
  }, [data]);

  return (
    <div className="fixed left-0 top-0 bg-black/80 z-[300] w-full h-full p-[60px] animate-fade">
      <div className="w-full h-full bg-black border-tableBorder border-2 rounded-xl p-[20px] relative">
        <button
          onClick={closeModal}
          className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-black hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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

        <button
          className="flex absolute right-[40px] top-[7px] pointer hover:bg-third rounded-lg transition-all group px-2.5 py-2.5 text-sm font-semibold bg-transparent text-gray-800 hover:bg-gray-100 focus:text-primary-500"
          type="button"
        >
          <div className="relative flex gap-2 items-center justify-center">
            <input
              type="file"
              className="absolute left-0 top-0 w-full h-full opacity-0"
              accept="image/*"
              onChange={uploadMedia}
            />
            <span className="sc-dhKdcB fhJPPc w-4 h-4">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.5276 1.00176C7.3957 0.979897 8.25623 1.16248 9.04309 1.53435C9.82982 1.90617 10.5209 2.45677 11.065 3.14199C11.3604 3.51404 11.6084 3.92054 11.8045 4.3516C12.2831 4.21796 12.7853 4.17281 13.2872 4.22273C14.2108 4.3146 15.0731 4.72233 15.7374 5.3744C16.4012 6.02599 16.8292 6.88362 16.9586 7.808C17.088 8.73224 16.9124 9.67586 16.457 10.4887C16.1871 10.9706 15.5777 11.1424 15.0958 10.8724C14.614 10.6025 14.4422 9.99308 14.7122 9.51126C14.9525 9.08224 15.0471 8.57971 14.9779 8.08532C14.9087 7.59107 14.6807 7.13971 14.3364 6.8017C13.9925 6.46418 13.5528 6.25903 13.0892 6.21291C12.6258 6.16682 12.1584 6.28157 11.7613 6.5429C11.4874 6.7232 11.1424 6.7577 10.8382 6.63524C10.534 6.51278 10.3091 6.24893 10.2365 5.92912C10.1075 5.36148 9.8545 4.83374 9.49872 4.38568C9.14303 3.93773 8.69439 3.58166 8.18851 3.34258C7.68275 3.10355 7.13199 2.98717 6.57794 3.00112C6.02388 3.01507 5.47902 3.15905 4.98477 3.4235C4.49039 3.68801 4.05875 4.06664 3.72443 4.53247C3.39004 4.9984 3.16233 5.5387 3.06049 6.11239C2.95864 6.68613 2.98571 7.27626 3.1394 7.83712C3.29306 8.39792 3.56876 8.91296 3.94345 9.34361C4.30596 9.76027 4.26207 10.3919 3.84542 10.7544C3.42876 11.1169 2.79712 11.073 2.4346 10.6564C1.8607 9.99678 1.44268 9.213 1.2105 8.36566C0.978333 7.51837 0.937639 6.62828 1.09128 5.76282C1.24492 4.89732 1.58919 4.07751 2.09958 3.36634C2.61005 2.65507 3.27363 2.07075 4.04125 1.66005C4.80899 1.24927 5.65951 1.02361 6.5276 1.00176Z"
                  fill="currentColor"
                ></path>
                <path
                  d="M8 12.4142L8 17C8 17.5523 8.44771 18 9 18C9.55228 18 10 17.5523 10 17V12.4142L11.2929 13.7071C11.6834 14.0976 12.3166 14.0976 12.7071 13.7071C13.0976 13.3166 13.0976 12.6834 12.7071 12.2929L9.70711 9.29289C9.61123 9.19702 9.50073 9.12468 9.38278 9.07588C9.26488 9.02699 9.13559 9 9 9C8.86441 9 8.73512 9.02699 8.61722 9.07588C8.50195 9.12357 8.3938 9.19374 8.29945 9.2864C8.29705 9.28875 8.29467 9.29111 8.2923 9.29349L5.29289 12.2929C4.90237 12.6834 4.90237 13.3166 5.29289 13.7071C5.68342 14.0976 6.31658 14.0976 6.70711 13.7071L8 12.4142Z"
                  fill="currentColor"
                ></path>
              </svg>
            </span>
            <span>Upload assets</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-[10px] mt-[35px] pt-[20px] border-tableBorder border-t-2">
          {mediaList.map((media) => (
            <div
              key={media.id}
              className="w-[200px] h-[200px] border-tableBorder border-2 cursor-pointer"
              onClick={setNewMedia(media)}
            >
              <img
                className="w-full h-full object-cover"
                src={mediaDirectory.set(media.path)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export const MediaComponent: FC<{
  label: string;
  description: string;
  value?: { path: string; id: string };
  name: string;
  onChange: (event: {
    target: { name: string; value?: { id: string; path: string } };
  }) => void;
}> = (props) => {
  const { name, label, description, onChange, value } = props;
  const {getValues} = useSettings();
  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentMedia(settings);
    }
  }, []);
  const [modal, setShowModal] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();

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
      {modal && <MediaBox setMedia={changeMedia} closeModal={showModal} />}
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
      <div className="flex">
        <Button onClick={showModal}>Select</Button>
        <Button secondary={true} onClick={clearMedia}>
          Clear
        </Button>
      </div>
    </div>
  );
};
