import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  VideoAbstract,
  VideoParams,
} from '@gitroom/nestjs-libraries/videos/video.interface';

@Injectable()
export class VideoManager {
  constructor(private _moduleRef: ModuleRef) {}

  getAllVideos(): any[] {
    return (Reflect.getMetadata('video', VideoAbstract) || []).filter((f: any) => f.available).map(
      (p: any) => ({
        identifier: p.identifier,
        title: p.title,
        description: p.description,
        placement: p.placement,
      })
    );
  }

  getVideoByName(
    identifier: string
  ): (VideoParams & { instance: VideoAbstract }) | undefined {
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
