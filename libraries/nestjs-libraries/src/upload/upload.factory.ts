import { CloudflareStorage } from './cloudflare.storage';
import { IUploadProvider } from './upload.interface';
import { LocalStorage } from './local.storage';
import { S3CompatibleStorage } from './s3-compatible.storage';
import { FTPStorage } from './ftp.storage';
import { SFTPStorage } from './sftp.storage';

export class UploadFactory {
  /**
   * Create storage provider instance based on environment configuration
   * @returns IUploadProvider - Configured storage provider
   */
  static createStorage(): IUploadProvider {
    const storageProvider = process.env.STORAGE_PROVIDER || 'local';

    switch (storageProvider) {
      case 'local':
        if (!process.env.UPLOAD_DIRECTORY) {
          throw new Error('UPLOAD_DIRECTORY environment variable is required for local storage');
        }
        return new LocalStorage(process.env.UPLOAD_DIRECTORY);

      case 'cloudflare':
        const requiredCloudflareVars = [
          'CLOUDFLARE_ACCOUNT_ID',
          'CLOUDFLARE_ACCESS_KEY',
          'CLOUDFLARE_SECRET_ACCESS_KEY',
          'CLOUDFLARE_REGION',
          'CLOUDFLARE_BUCKETNAME',
          'CLOUDFLARE_BUCKET_URL'
        ];

        for (const varName of requiredCloudflareVars) {
          if (!process.env[varName]) {
            throw new Error(`${varName} environment variable is required for Cloudflare storage`);
          }
        }

        return new CloudflareStorage(
          process.env.CLOUDFLARE_ACCOUNT_ID!,
          process.env.CLOUDFLARE_ACCESS_KEY!,
          process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
          process.env.CLOUDFLARE_REGION!,
          process.env.CLOUDFLARE_BUCKETNAME!,
          process.env.CLOUDFLARE_BUCKET_URL!
        );

      case 's3-compatible':
        const requiredS3Vars = [
          'S3_COMPATIBLE_ACCESS_KEY',
          'S3_COMPATIBLE_SECRET_KEY',
          'S3_COMPATIBLE_REGION',
          'S3_COMPATIBLE_BUCKET'
        ];

        for (const varName of requiredS3Vars) {
          if (!process.env[varName]) {
            throw new Error(`${varName} environment variable is required for S3-compatible storage`);
          }
        }

        return new S3CompatibleStorage(
          process.env.S3_COMPATIBLE_ACCESS_KEY!,
          process.env.S3_COMPATIBLE_SECRET_KEY!,
          process.env.S3_COMPATIBLE_REGION!,
          process.env.S3_COMPATIBLE_BUCKET!,
          process.env.S3_COMPATIBLE_ENDPOINT, // Optional custom endpoint
          process.env.S3_COMPATIBLE_PUBLIC_URL, // Optional public URL
          process.env.S3_COMPATIBLE_PATH_STYLE === 'true', // Path style (for MinIO)
          process.env.S3_COMPATIBLE_SIGNED_URLS === 'true', // Use signed URLs
          process.env.S3_COMPATIBLE_SIGNED_URL_EXPIRY ? parseInt(process.env.S3_COMPATIBLE_SIGNED_URL_EXPIRY) : 3600
        );

      case 'ftp':
        const requiredFtpVars = [
          'FTP_HOST',
          'FTP_USER',
          'FTP_PASSWORD',
          'FTP_REMOTE_PATH',
          'FTP_PUBLIC_URL'
        ];

        for (const varName of requiredFtpVars) {
          if (!process.env[varName]) {
            throw new Error(`${varName} environment variable is required for FTP storage`);
          }
        }

        return new FTPStorage(
          process.env.FTP_HOST!,
          process.env.FTP_PORT ? parseInt(process.env.FTP_PORT) : 21,
          process.env.FTP_USER!,
          process.env.FTP_PASSWORD!,
          process.env.FTP_REMOTE_PATH!,
          process.env.FTP_PUBLIC_URL!,
          process.env.FTP_SECURE === 'true',
          process.env.FTP_PASSIVE_MODE !== 'false' // Default to true
        );

      case 'sftp':
        const requiredSftpVars = [
          'SFTP_HOST',
          'SFTP_USER',
          'SFTP_REMOTE_PATH',
          'SFTP_PUBLIC_URL'
        ];

        for (const varName of requiredSftpVars) {
          if (!process.env[varName]) {
            throw new Error(`${varName} environment variable is required for SFTP storage`);
          }
        }

        // Validate authentication method
        if (!process.env.SFTP_PASSWORD && !process.env.SFTP_PRIVATE_KEY_PATH) {
          throw new Error('Either SFTP_PASSWORD or SFTP_PRIVATE_KEY_PATH must be provided for SFTP authentication');
        }

        return new SFTPStorage(
          process.env.SFTP_HOST!,
          process.env.SFTP_PORT ? parseInt(process.env.SFTP_PORT) : 22,
          process.env.SFTP_USER!,
          process.env.SFTP_REMOTE_PATH!,
          process.env.SFTP_PUBLIC_URL!,
          process.env.SFTP_PASSWORD,
          process.env.SFTP_PRIVATE_KEY_PATH
        );

      default:
        throw new Error(
          `Invalid storage provider '${storageProvider}'. ` +
          `Supported providers: local, cloudflare, s3-compatible, ftp, sftp`
        );
    }
  }
}
