'use client';
import 'reflect-metadata';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import dayjs from 'dayjs';
import type { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import { FC, useEffect, useState } from 'react';
import { useExistingData } from '@gitroom/frontend/components/new-launch/helpers/use.existing.data';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AddEditModalInnerInner } from '@gitroom/frontend/components/new-launch/add.edit.modal.inner';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';

export interface AddEditModalProps {
  date: dayjs.Dayjs;
  integrations: Integrations[];
  allIntegrations?: Integrations[];
  set?: CreatePostDto;
  addEditSets?: (data: any) => void;
  reopenModal: () => void;
  mutate: () => void;
  padding?: string;
  customClose?: () => void;
  onlyValues?: Array<{
    content: string;
    id?: string;
    image?: Array<{
      id: string;
      path: string;
    }>;
  }>;
}

export const AddEditModal: FC<AddEditModalProps> = (props) => {
  const setAllIntegrations = useLaunchStore(
    (state) => state.setAllIntegrations
  );

  const integrations = useLaunchStore((state) => state.integrations);

  useEffect(() => {
    setAllIntegrations(props.integrations || []);
  }, []);

  if (!integrations.length) {
    return null;
  }

  return <AddEditModalInner {...props} />;
};

export const AddEditModalInner: FC<AddEditModalProps> = (props) => {
  const existingData = useExistingData();
  const reset = useLaunchStore((state) => state.reset);

  const addOrRemoveSelectedIntegration = useLaunchStore(
    (state) => state.addOrRemoveSelectedIntegration
  );

  const addGlobalValue = useLaunchStore((state) => state.addGlobalValue);
  const addInternalValue = useLaunchStore((state) => state.addInternalValue);
  const selectedIntegrations = useLaunchStore((state) => state.selectedIntegrations);
  const global = useLaunchStore((state) => state.global);
  const internal = useLaunchStore((state) => state.internal);

  useEffect(() => {
    if (existingData.integration) {
      const integration = props.integrations.find(
        (i) => i.id === existingData.integration
      );
      addOrRemoveSelectedIntegration(integration, existingData.settings);

      addInternalValue(0, existingData.settings, existingData.posts.map((post) => ({
        content: post.content,
        id: post.id,
        // @ts-ignore
        media: post.image as any[],
      })));
    }
    else {
      addGlobalValue(0, [{
        content: '',
        id: makeId(10),
        media: [],
      }]);
    }

    return () => {
      reset();
    };
  }, []);

  if (!selectedIntegrations.length && !global.length && !internal.length) {
    return null;
  }

  return <AddEditModalInnerInner {...props} />;
};
