// Contract of the ingest and clip jobs of the media service (postiz-uploader
// schema/v1, README 4.4 and 4.5). Same envelope and failure block as the
// normalization jobs: URLs in, metadata out.
export interface ProcessorFailure {
  code: string;
  message: string;
  retryable: boolean;
  stderr_tail?: string | null;
}

export interface IngestJob {
  version: 1;
  type: 'ingest';
  reference: string;
  source: {
    url: string;
    via: 'direct' | 'ytdlp' | 'oxylabs';
    max_height?: number;
    start_seconds?: number;
    end_seconds?: number;
  };
  video?: { url: string };
  audio?: { url: string; unless_transcript?: boolean };
  transcript?: { url: string; languages: string[] };
  limits?: {
    max_input_bytes?: number;
    max_duration_seconds?: number;
    timeout_seconds?: number;
  };
}

// the transport may drop keys whose value is null, so a missing key is null
export interface IngestResult {
  version: 1;
  reference: string;
  status: 'completed' | 'failed';
  source?: {
    title?: string | null;
    description?: string | null;
    uploader?: string | null;
    thumbnail_url?: string | null;
    duration_seconds?: number | null;
    trim?: { start_seconds: number; end_seconds: number } | null;
  } | null;
  video?: { bytes: number; duration_seconds?: number | null } | null;
  audio?: { bytes: number; duration_seconds?: number | null } | null;
  transcript?: {
    language: string;
    origin: 'auto_generated' | 'uploader_provided';
    word_level: boolean;
    segments: number;
    words: number;
  } | null;
  failure?: ProcessorFailure | null;
}

export interface ClippingWord {
  text: string;
  start: number;
  end: number;
}

// The transcript file the ingest job writes; a transcription of the audio is
// stored in the same shape so everything downstream reads one format
export interface ClippingTranscript {
  version: 1;
  language: string;
  origin: 'auto_generated' | 'uploader_provided' | 'transcribed';
  word_level: boolean;
  segments: { start: number; end: number; text: string }[];
  words: ClippingWord[];
}

export interface ClipJob {
  version: 1;
  type: 'clip';
  reference: string;
  source: { url: string };
  clips: {
    reference: string;
    start_seconds: number;
    end_seconds: number;
    output: { url: string };
    thumbnail?: { url: string; timestamp_seconds?: number };
  }[];
  frame: {
    width: number;
    height: number;
    fit: 'crop' | 'blur';
    focus_x?: number;
    focus_y?: number;
  };
  captions?: {
    words: ClippingWord[];
    style?: {
      font?: string;
      highlight_color?: string | null;
      position?: 'top' | 'middle' | 'bottom';
      max_words?: number;
      max_chars?: number;
      uppercase?: boolean;
    };
  };
  limits?: {
    max_input_bytes?: number;
    max_clip_seconds?: number;
    timeout_seconds?: number;
  };
}

export interface ClipResult {
  version: 1;
  reference: string;
  status: 'completed' | 'partial' | 'failed';
  clips: {
    reference: string;
    status: 'completed' | 'failed';
    output?: { bytes: number; duration_seconds?: number | null } | null;
    thumbnail?: { bytes: number } | null;
    failure?: ProcessorFailure | null;
  }[];
  failure?: ProcessorFailure | null;
}
