import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  VideoAbstract,
  VideoParams,
} from '@gitroom/nestjs-libraries/videos/video.interface';

@Injectable()
export class VideoManager {
  constructor(private _moduleRef: ModuleRef) {}

  getAllVideos(): {
    identifier: string;
    title: string;
    dto: any;
    description: string;
    target: VideoAbstract<any>,
    tools: { functionName: string; output: string }[];
    placement: string;
    trial: boolean;
  }[] {
    return (Reflect.getMetadata('video', VideoAbstract) || [])
      .filter((f: any) => f.available)
      .map((p: any) => ({
        target: p.target,
        identifier: p.identifier,
        title: p.title,
        tools: p.tools,
        dto: p.dto,
        description: p.description,
        placement: p.placement,
        trial: p.trial,
      }));
  }

  checkAvailableVideoFunction(method: any) {
    const videoFunction = Reflect.getMetadata('video-function', method);
    return !videoFunction;
  }

  getVideoByName(
    identifier: string
  ): (VideoParams & { instance: VideoAbstract<any> }) | undefined {
    const video = (Reflect.getMetadata('video', VideoAbstract) || []).find(
      (p: any) => p.identifier === identifier
    );

    return {
      ...video,
      instance: this._moduleRef.get(video.target, {
        strict: false,
      }),
    };
  }
}
