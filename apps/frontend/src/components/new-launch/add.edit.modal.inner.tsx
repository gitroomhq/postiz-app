'use client';

import React, { FC, Fragment, useRef } from 'react';
import { AddEditModalProps } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import clsx from 'clsx';
import { TopTitle } from '@gitroom/frontend/components/new-launch/helpers/top.title.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PicksSocialsComponent } from '@gitroom/frontend/components/new-launch/picks.socials.component';
import {
  Editor,
  EditorWrapper,
} from '@gitroom/frontend/components/new-launch/editor';
import { SelectCurrent } from '@gitroom/frontend/components/new-launch/select.current';
import { ShowAllProviders } from '@gitroom/frontend/components/new-launch/providers/show.all.providers';

export const AddEditModalInnerInner: FC<AddEditModalProps> = () => {
  const t = useT();
  const ref = useRef(null);

  return (
    <div
      id="add-edit-modal"
      className={clsx(
        'flex flex-col md:flex-row p-[10px] rounded-[4px] bg-primary gap-[20px]'
      )}
    >
      <div
        className={clsx(
          'flex flex-col gap-[16px] transition-all duration-700 whitespace-nowrap'
        )}
      >
        <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
          <TopTitle title="Create Post">
            <div className="flex items-center">asd</div>
          </TopTitle>

          <PicksSocialsComponent toolTip={true} />
          <div>
            <SelectCurrent />
            <div className="flex gap-[4px]">
              <div className="flex-1 editor text-textColor gap-[10px] flex-col flex">
                <EditorWrapper totalPosts={1} value="" />
                <div className="flex">
                  <div className="flex-1">media</div>
                  <div className="flex bg-customColor20 rounded-br-[8px] text-customColor19"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative min-h-[68px] flex flex-col rounded-[4px] border border-customColor6 bg-sixth">
          <div className="gap-[10px] relative flex flex-col justify-center items-center min-h-full pe-[16px]">
            <div
              id="add-edit-post-dialog-buttons"
              className="flex flex-row flex-wrap w-full h-full gap-[10px] justify-end items-center"
            >
              <div className="flex justify-center items-center gap-[5px] h-full">
                <div
                  className="h-full flex items-center text-white"
                  onClick={async () => {
                    console.log(await ref.current.checkAllValid());
                  }}
                >
                  test
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'flex gap-[20px] flex-col rounded-[4px] border-customColor6 bg-sixth flex-1 transition-all duration-700'
        )}
      >
        <div className="mx-[16px]">
          <TopTitle title="" removeTitle={true}>
            <svg
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="cursor-pointer"
            >
              <path
                d="M9.85403 9.64628C9.90048 9.69274 9.93733 9.74789 9.96247 9.80859C9.98762 9.86928 10.0006 9.93434 10.0006 10C10.0006 10.0657 9.98762 10.1308 9.96247 10.1915C9.93733 10.2522 9.90048 10.3073 9.85403 10.3538C9.80757 10.4002 9.75242 10.4371 9.69173 10.4622C9.63103 10.4874 9.56598 10.5003 9.50028 10.5003C9.43458 10.5003 9.36953 10.4874 9.30883 10.4622C9.24813 10.4371 9.19298 10.4002 9.14653 10.3538L5.00028 6.20691L0.854028 10.3538C0.760208 10.4476 0.63296 10.5003 0.500278 10.5003C0.367596 10.5003 0.240348 10.4476 0.146528 10.3538C0.0527077 10.26 2.61548e-09 10.1327 0 10C-2.61548e-09 9.86735 0.0527077 9.7401 0.146528 9.64628L4.2934 5.50003L0.146528 1.35378C0.0527077 1.25996 0 1.13272 0 1.00003C0 0.867352 0.0527077 0.740104 0.146528 0.646284C0.240348 0.552464 0.367596 0.499756 0.500278 0.499756C0.63296 0.499756 0.760208 0.552464 0.854028 0.646284L5.00028 4.79316L9.14653 0.646284C9.24035 0.552464 9.3676 0.499756 9.50028 0.499756C9.63296 0.499756 9.76021 0.552464 9.85403 0.646284C9.94785 0.740104 10.0006 0.867352 10.0006 1.00003C10.0006 1.13272 9.94785 1.25996 9.85403 1.35378L5.70715 5.50003L9.85403 9.64628Z"
                fill="currentColor"
              />
            </svg>
          </TopTitle>
        </div>
        <div className="flex-1 flex flex-col p-[16px] pt-0">
          <ShowAllProviders ref={ref} />
        </div>
      </div>
    </div>
  );
};
