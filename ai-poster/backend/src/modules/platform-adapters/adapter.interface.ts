export interface RawContent {
  text: string;
  title?: string;
  media?: any[];
  settings?: Record<string, any>;
}

export interface FormattedPost {
  content: string;
  title?: string;
  media?: any[];
  thread?: FormattedPost[];
  settings?: Record<string, any>;
}

export interface ValidationResult {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SettingsField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'boolean' | 'number';
  required: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: any;
}

export interface AdapterOptions {
  isPremium?: boolean;
  templateTone?: string;
}

export interface PlatformAdapterInterface {
  platform: string;
  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost;
  validate(content: string, media?: any[]): ValidationResult[];
  splitIntoThread(content: string): string[];
  getMaxChars(): number;
  getSettingsSchema(): SettingsField[];
}
