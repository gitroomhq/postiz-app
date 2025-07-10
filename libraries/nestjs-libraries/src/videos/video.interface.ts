import { Injectable } from '@nestjs/common';

export interface Prompt {
  type: 'prompt' | 'image';
  value: string;
}

export type URL = string;

export abstract class VideoAbstract {
  abstract process(
    prompt: Prompt[],
    output: 'vertical' | 'horizontal',
    customParams?: any
  ): Promise<URL>;
}

export interface VideoParams {
  identifier: string;
  title: string;
  description: string;
  placement: 'text-to-image' | 'image-to-video' | 'video-to-video';
  available: boolean;
}

export function Video(params: VideoParams) {
  return function (target: any) {
    // Apply @Injectable decorator to the target class
    Injectable()(target);

    // Retrieve existing metadata or initialize an empty array
    const existingMetadata = Reflect.getMetadata('video', VideoAbstract) || [];

    // Add the metadata information for this method
    existingMetadata.push({ target, ...params });

    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata('video', existingMetadata, VideoAbstract);
  };
}
