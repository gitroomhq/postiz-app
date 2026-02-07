import { Injectable } from '@nestjs/common';
import {
  PlatformAdapterInterface,
  RawContent,
  FormattedPost,
  ValidationResult,
  AdapterOptions,
} from './adapter.interface';

@Injectable()
export class PlatformAdapterService {
  private adapters: Map<string, PlatformAdapterInterface> = new Map();

  registerAdapter(adapter: PlatformAdapterInterface): void {
    this.adapters.set(adapter.platform.toLowerCase(), adapter);
  }

  getAdapter(platform: string): PlatformAdapterInterface {
    const adapter = this.adapters.get(platform.toLowerCase());
    if (!adapter) {
      throw new Error(
        `No adapter registered for platform: ${platform}. Available platforms: ${this.getAllPlatforms().join(', ')}`
      );
    }
    return adapter;
  }

  getAllPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  formatForPlatform(
    platform: string,
    content: RawContent,
    options?: AdapterOptions
  ): FormattedPost {
    const adapter = this.getAdapter(platform);
    return adapter.formatContent(content, options);
  }

  validateForPlatform(
    platform: string,
    content: string,
    media?: any[]
  ): ValidationResult[] {
    const adapter = this.getAdapter(platform);
    return adapter.validate(content, media);
  }
}
