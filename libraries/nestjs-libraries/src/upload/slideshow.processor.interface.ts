import { ProcessorFailure } from './clipping.processor.interface';

// Contract of the slideshow job of the media service (postiz-uploader
// schema/v1, README 4.6): N (image, audio) pairs in, one crossfaded and
// subtitled mp4 out. Same envelope and failure block as the other jobs.
export interface SlideshowJob {
  version: 1;
  type: 'slideshow';
  reference: string;
  slides: {
    image: { url: string };
    audio: { url: string };
    duration_seconds?: number;
  }[];
  frame?: { width: number; height: number };
  fit?: 'contain' | 'cover';
  audio_delay_seconds?: number;
  // added to the audio's length to get a slide's duration; includes the delay
  tail_seconds?: number;
  transition_seconds?: number;
  subtitles?: {
    // on the output timeline, crossfades already subtracted
    cues: { start: number; end: number; text: string }[];
    style?: {
      font?: string;
      font_size?: number;
      position?: 'top' | 'middle' | 'bottom';
    };
  };
  output: { url: string; content_type?: 'video/mp4' };
  video?: {
    quality?: number;
    fps?: number;
    audio_bitrate_kbps?: number;
    audio_sample_rate?: 44100 | 48000;
  };
  limits?: { max_input_bytes?: number; timeout_seconds?: number };
}

export interface SlideshowResult {
  version: 1;
  type: 'slideshow';
  reference: string;
  status: 'completed' | 'failed';
  output?: {
    width: number;
    height: number;
    duration_seconds?: number | null;
    bytes: number;
    content_type: string;
    slides: number;
    subtitle_cues: number;
  } | null;
  failure?: ProcessorFailure | null;
}
