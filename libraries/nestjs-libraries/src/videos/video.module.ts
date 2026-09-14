import { Global, Module } from '@nestjs/common';
import { ImagesSlides } from '@gitroom/nestjs-libraries/videos/images-slides/images.slides';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { Seedance } from '@gitroom/nestjs-libraries/videos/seedance/seedance';

@Global()
@Module({
  providers: [ImagesSlides, Seedance, VideoManager],
  get exports() {
    return this.providers;
  },
})
export class VideoModule {}
