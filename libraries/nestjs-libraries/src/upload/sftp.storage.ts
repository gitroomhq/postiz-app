import SftpClient from 'ssh2-sftp-client';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
import { IUploadProvider } from './upload.interface';
import axios from 'axios';
import * as fs from 'fs';

/**
 * SFTP storage provider for secure file transfer over SSH
 * Supports password and SSH key authentication
 */
export class SFTPStorage implements IUploadProvider {
  private _host: string;
  private _port: number;
  private _user: string;
  private _password?: string;
  private _privateKeyPath?: string;
  private _remotePath: string;
  private _publicUrl: string;

  /**
   * Initialize SFTP storage provider
   * @param host - SFTP server hostname
   * @param port - SFTP server port (default: 22)
   * @param user - SFTP username
   * @param remotePath - Remote directory path on SFTP server
   * @param publicUrl - Public URL where uploaded files will be accessible via HTTP
   * @param password - SFTP password (optional if using SSH key)
   * @param privateKeyPath - Path to SSH private key file (optional if using password)
   */
  constructor(
    host: string,
    port: number = 22,
    user: string,
    remotePath: string,
    publicUrl: string,
    password?: string,
    privateKeyPath?: string
  ) {
    this._host = host;
    this._port = port;
    this._user = user;
    this._password = password;
    this._privateKeyPath = privateKeyPath;
    this._remotePath = remotePath.endsWith('/') ? remotePath.slice(0, -1) : remotePath;
    this._publicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;

    // Validate authentication method
    if (!password && !privateKeyPath) {
      throw new Error('Either password or privateKeyPath must be provided for SFTP authentication');
    }
  }

  /**
   * Create and configure SFTP client connection
   * @returns Promise<SftpClient> - Configured SFTP client
   */
  private async createSFTPClient(): Promise<SftpClient> {
    const client = new SftpClient();

    try {
      const connectConfig: any = {
        host: this._host,
        port: this._port,
        username: this._user,
        readyTimeout: 30000, // 30 seconds timeout
        keepaliveInterval: 10000, // 10 seconds keepalive
      };

      // Configure authentication method
      if (this._privateKeyPath) {
        // SSH key authentication
        try {
          const privateKey = fs.readFileSync(this._privateKeyPath);
          connectConfig.privateKey = privateKey;
        } catch (error) {
          throw new Error(`Failed to read private key from ${this._privateKeyPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (this._password) {
        // Password authentication
        connectConfig.password = this._password;
      }

      await client.connect(connectConfig);
      return client;
    } catch (error) {
      await client.end();
      throw new Error(`Failed to connect to SFTP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate date-based directory structure (YYYY/MM/DD)
   * @returns string - Directory path
   */
  private generateDatePath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Ensure directory exists on SFTP server, creating if necessary
   * @param client - SFTP client
   * @param dirPath - Directory path to create
   */
  private async ensureDirectory(client: SftpClient, dirPath: string): Promise<void> {
    try {
      // Try to create directory (will fail if it already exists, which is fine)
      await client.mkdir(dirPath, true); // recursive = true
    } catch (error) {
      // Directory might already exist, check if it's accessible
      try {
        await client.list(dirPath);
      } catch (listError) {
        throw new Error(`Failed to create or access directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Upload a file from a URL via SFTP
   * @param path - URL of the file to upload
   * @returns Promise<string> - The public URL where the uploaded file can be accessed
   */
  async uploadSimple(path: string): Promise<string> {
    let client: SftpClient | null = null;

    try {
      // Download file from URL
      const response = await axios.get(path, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      const extension = getExtension(contentType);
      if (!extension) {
        throw new Error(`Unable to determine file extension for content type: ${contentType}`);
      }

      // Generate file path
      const datePath = this.generateDatePath();
      const id = makeId(10);
      const fileName = `${id}.${extension}`;
      const remoteDir = `${this._remotePath}/${datePath}`;
      const remoteFilePath = `${remoteDir}/${fileName}`;
      const publicPath = `${datePath}/${fileName}`;

      // Connect to SFTP server
      client = await this.createSFTPClient();

      // Ensure directory exists
      await this.ensureDirectory(client, remoteDir);

      // Upload file
      await client.put(Buffer.from(response.data), remoteFilePath);

      return `${this._publicUrl}/${publicPath}`;
    } catch (error) {
      console.error('Error uploading file via SFTP uploadSimple:', error);
      throw new Error(`Failed to upload file from ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Upload a file from form data via SFTP
   * @param file - The uploaded file object
   * @returns Promise<any> - File information including the public access URL
   */
  async uploadFile(file: Express.Multer.File): Promise<any> {
    let client: SftpClient | null = null;

    try {
      // Generate file path
      const datePath = this.generateDatePath();
      const id = makeId(10);
      const extension = mime.extension(file.mimetype) || 'bin';
      const fileName = `${id}.${extension}`;
      const remoteDir = `${this._remotePath}/${datePath}`;
      const remoteFilePath = `${remoteDir}/${fileName}`;
      const publicPath = `${datePath}/${fileName}`;

      // Connect to SFTP server
      client = await this.createSFTPClient();

      // Ensure directory exists
      await this.ensureDirectory(client, remoteDir);

      // Upload file
      await client.put(file.buffer, remoteFilePath);

      const publicUrl = `${this._publicUrl}/${publicPath}`;

      return {
        filename: fileName,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        originalname: fileName,
        fieldname: 'file',
        path: publicUrl,
        destination: publicUrl,
        encoding: '7bit',
        stream: file.buffer as any,
      };
    } catch (error) {
      console.error('Error uploading file via SFTP uploadFile:', error);
      throw new Error(`Failed to upload file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Remove a file from SFTP storage
   * @param filePath - The public URL of the file to remove
   * @returns Promise<void>
   */
  async removeFile(filePath: string): Promise<void> {
    let client: SftpClient | null = null;

    try {
      // Extract relative path from public URL
      const relativePath = filePath.replace(this._publicUrl + '/', '');
      const remoteFilePath = `${this._remotePath}/${relativePath}`;

      // Connect to SFTP server
      client = await this.createSFTPClient();

      // Remove file
      await client.delete(remoteFilePath);
    } catch (error) {
      console.error('Error removing file via SFTP:', error);
      // Don't throw error for file removal failures to avoid breaking the application
      // Just log the error as the file might already be deleted or not exist
      console.warn(`Failed to remove file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.end();
      }
    }
  }
}