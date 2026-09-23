// Contract of the media normalization service (postiz-uploader schema/v1).
// The service knows nothing about Postiz: URLs in, metadata out.
export interface MediaProcessorJob {
  version: 1;
  type: 'video' | 'image';
  reference: string;
  source: { url: string; content_type?: string };
  output: { url: string; content_type: string };
  thumbnail?: {
    url: string;
    timestamp_seconds?: number;
    content_type?: 'image/jpeg';
  };
  rules: {
    short_side_min: number;
    short_side_max: number;
    long_side_max: number;
    video?: {
      container?: 'mp4';
      video_codec?: 'h264';
      profile?: string;
      pixel_format?: string;
      fps_max?: number;
      quality?: number;
      audio_codec?: string;
      audio_bitrate_kbps?: number;
      audio_sample_rate?: number;
      faststart?: boolean;
    };
    image?: { jpeg_quality?: number; keep_format?: boolean };
  };
  limits?: {
    max_input_bytes?: number;
    max_duration_seconds?: number;
    timeout_seconds?: number;
  };
}

export interface MediaProcessorResult {
  version: 1;
  reference: string;
  status: 'completed' | 'unchanged' | 'failed';
  actions: string[];
  output?: {
    width: number;
    height: number;
    duration_seconds?: number;
    bytes: number;
    content_type: string;
  };
  thumbnail?: { width: number; height: number; bytes: number } | null;
  failure?: {
    code: string;
    message: string;
    retryable: boolean;
    stderr_tail?: string;
  } | null;
}

export type MediaProcessorStatus<Result = MediaProcessorResult> =
  | { status: 'pending' }
  | { status: 'completed'; result: Result }
  // the queue itself failed (crash, expired job); retryable by the caller
  | { status: 'failed'; error: string };

export interface IMediaProcessor<
  Job = MediaProcessorJob,
  Result = MediaProcessorResult
> {
  submit(job: Job): Promise<string>;
  status(jobId: string): Promise<MediaProcessorStatus<Result>>;
}
