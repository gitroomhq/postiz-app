import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { ClippingService } from '@gitroom/nestjs-libraries/database/prisma/clipping/clipping.service';

// An activity on main can never change its parameters, so every one takes a
// single object of ids: the state lives on the clipping records, and a field
// can be added to the object without a new activity
@Injectable()
@Activity()
export class ClippingActivity {
  constructor(private _clippingService: ClippingService) {}

  @ActivityMethod()
  async submitClippingAnalyse({ clippingId }: { clippingId: string }) {
    return this._clippingService.submitAnalyse(clippingId);
  }

  @ActivityMethod()
  async checkClippingAnalyse({
    clippingId,
    jobId,
  }: {
    clippingId: string;
    jobId: string;
  }) {
    return this._clippingService.checkAnalyse(clippingId, jobId);
  }

  @ActivityMethod()
  async transcribeClipping({ clippingId }: { clippingId: string }) {
    return this._clippingService.transcribe(clippingId);
  }

  @ActivityMethod()
  async pickClippingClips({ clippingId }: { clippingId: string }) {
    return this._clippingService.pickClips(clippingId);
  }

  @ActivityMethod()
  async submitClipFetch({ clipId }: { clipId: string }) {
    return this._clippingService.submitClipFetch(clipId);
  }

  @ActivityMethod()
  async checkClipFetch({ clipId, jobId }: { clipId: string; jobId: string }) {
    return this._clippingService.checkClipFetch(clipId, jobId);
  }

  @ActivityMethod()
  async captionClip({ clipId }: { clipId: string }) {
    return this._clippingService.captionClip(clipId);
  }

  @ActivityMethod()
  async submitClipRender({ clipId }: { clipId: string }) {
    return this._clippingService.submitClipRender(clipId);
  }

  @ActivityMethod()
  async checkClipRender({ clipId, jobId }: { clipId: string; jobId: string }) {
    return this._clippingService.checkClipRender(clipId, jobId);
  }

  // "customer" says the error was written for the customer to read
  @ActivityMethod()
  async failClip({
    clipId,
    error,
    customer,
  }: {
    clipId: string;
    error: string;
    customer?: boolean;
  }) {
    return this._clippingService.failClip(clipId, error, customer);
  }

  @ActivityMethod()
  async createClippingDrafts({ clippingId }: { clippingId: string }) {
    return this._clippingService.createDrafts(clippingId);
  }

  @ActivityMethod()
  async finishClipping({ clippingId }: { clippingId: string }) {
    return this._clippingService.finishClipping(clippingId);
  }

  @ActivityMethod()
  async failClipping({
    clippingId,
    error,
    customer,
  }: {
    clippingId: string;
    error: string;
    customer?: boolean;
  }) {
    return this._clippingService.failClipping(clippingId, error, customer);
  }
}
