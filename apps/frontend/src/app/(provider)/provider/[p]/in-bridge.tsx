'use client';
import { FC } from 'react';
import ProviderPreviewBridge from './bridge';

export const InBridge: FC<{ provider: string }> = ({ provider }) => {
  return <ProviderPreviewBridge provider={provider} />;
};
