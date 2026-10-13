import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { VideoEdit } from '@gitroom/nestjs-libraries/videos/video.edit';

@Injectable()
@Activity()
export class MediaActivity {
  constructor(private _mediaService: MediaService) {}

  // Returns the processor job id, or null when there is nothing to process
  @ActivityMethod()
  async submitMediaProcessing(mediaId: string) {
    return this._mediaService.submitProcessing(mediaId);
  }

  // Returns true once the media record is final (ready or failed)
  @ActivityMethod()
  async checkMediaProcessing(mediaId: string, jobId: string) {
    return this._mediaService.checkProcessing(mediaId, jobId);
  }

  @ActivityMethod()
  async failMediaProcessing(mediaId: string, error: string) {
    return this._mediaService.failProcessing(mediaId, error);
  }

  // mediaId is the new library row. edit is the timeline. These two arguments
  // stay as they are; a change needs a new activity and a new workflow
  @ActivityMethod()
  async renderVideoEdit(mediaId: string, edit: VideoEdit) {
    return this._mediaService.renderVideoEdit(mediaId, edit);
  }
}
