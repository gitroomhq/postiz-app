import { Injectable } from '@nestjs/common';
import { SentryNotificationService } from '@gitroom/nestjs-libraries/services/sentry.notification.service';

@Injectable()
export class SentryWorkerService {
  constructor(private _sentryNotificationService: SentryNotificationService) {}

  trackJobStart(jobName: string, jobId: string, organizationId?: string) {
    this._sentryNotificationService.trackWorkerJobEvent('started', {
      jobName,
      jobId,
      organizationId,
    });
  }

  trackJobComplete(jobName: string, jobId: string, duration: number, organizationId?: string) {
    this._sentryNotificationService.trackWorkerJobEvent('completed', {
      jobName,
      jobId,
      organizationId,
      duration,
    });
  }

  trackJobFailed(jobName: string, jobId: string, error: any, attemptNumber: number, organizationId?: string) {
    this._sentryNotificationService.trackWorkerJobEvent('failed', {
      jobName,
      jobId,
      organizationId,
      error,
      attemptNumber,
    });
  }

  trackJobStalled(jobName: string, jobId: string, organizationId?: string) {
    this._sentryNotificationService.trackWorkerJobEvent('stalled', {
      jobName,
      jobId,
      organizationId,
    });
  }
}
