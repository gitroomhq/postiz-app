import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrivacyExportDto } from '@gitroom/nestjs-libraries/dtos/users/privacy.export.dto';
import { PrivacyExportRepository } from './privacy.export.repository';

@Injectable()
export class PrivacyExportService {
  constructor(private _exports: PrivacyExportRepository) {}

  async export(authorizedWorkspaceId: string, input: PrivacyExportDto) {
    // The caller must enforce platform super-admin access for person exports.
    // Person records span workspaces; only workspace exports are org-scoped.
    if (
      input.target === 'workspace' &&
      input.targetId !== authorizedWorkspaceId
    ) {
      throw new ForbiddenException(
        'The export target must be the authorized workspace.'
      );
    }
    const data = await this._exports.snapshot(input.target, input.targetId);
    if (!data) throw new NotFoundException('Export target not found.');
    this.checkSize(data, input.target === 'workspace' ? 'workspace' : '');
    const result = {
      format: 'postiz-privacy-export-v1',
      generatedAt: new Date().toISOString(),
      requestReference: input.requestReference,
      target: { type: input.target, id: input.targetId },
      reviewRequired: true,
      data,
      manifest: {
        credentialsExcluded: true,
        media:
          'Stored references only. Media bytes require authorised storage retrieval.',
        personAttribution:
          'Workspace posts do not store an author user ID. Workspace content is not attributed to a person merely because they are a member.',
        controllerInputRequired: [
          'Social network and OAuth provider records outside the Postiz database',
          'Payment provider, email delivery, support and operational monitoring records',
          'Backups and media storage, including availability of soft-deleted files',
          'AutoPost feed URLs and configurations require controller review because URLs may embed credentials',
          'Workspace marketplace orders and buyer correspondence require controller retrieval and third-party privacy review',
          'Clipping source URLs, error diagnostics and thumbnails on source records require controller review for embedded credentials',
          'AI conversations and traces require controller attribution review; opaque runtime payloads can contain credentials',
          'Opaque integration settings, plug configuration, error bodies and webhook URLs are withheld because they can contain credentials; controller must review any attributable non-secret data',
        ],
      },
    };
    const serialized = JSON.stringify(result, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    if (Buffer.byteLength(serialized, 'utf8') > 25_000_000) {
      throw new PayloadTooLargeException(
        'This export exceeds 25 MB. Request a manual controller export.'
      );
    }
    // Return the same JSON-safe representation that was checked for size.
    return JSON.parse(serialized);
  }

  private checkSize(value: unknown, path: string): void {
    if (Array.isArray(value)) {
      if (value.length > 1000)
        throw new PayloadTooLargeException(
          `Data category ${path} exceeds 1,000 records. Request a complete manual controller export.`
        );
      value.forEach((item, index) => this.checkSize(item, `${path}[${index}]`));
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        this.checkSize(item, path ? `${path}.${key}` : key);
      }
    }
  }
}
