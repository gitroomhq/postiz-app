import * as ftp from 'basic-ftp';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
import { IUploadProvider } from './upload.interface';
import axios from 'axios';
import { Readable } from 'stream';

/**
 * FTP storage provider for uploading files via FTP protocol
 * Supports both FTP and FTPS (FTP over SSL/TLS)
 */
export class FTPStorage implements IUploadProvider {
  private _host: string;
  private _port: number;
  private _user: string;
  private _password: string;
  private _remotePath: string;
  private _publicUrl: string;
  private _secure: boolean;
  private _passiveMode: boolean;

  /**
   * Initialize FTP storage provider
   * @param host - FTP server hostname
   * @param port - FTP server port (default: 21)
   * @param user - FTP username
   * @param password - FTP password
   * @param remotePath - Remote directory path on FTP server
   * @param publicUrl - Public URL where uploaded files will be accessible via HTTP
   * @param secure - Use FTPS (FTP over SSL/TLS) (default: false)
   * @param passiveMode - Use passive FTP mode (default: true)
   */
  constructor(
    host: string,
    port: number = 21,
    user: string,
    password: string,
    remotePath: string,
    publicUrl: string,
    secure: boolean = false,
    passiveMode: boolean = true
  ) {
    this._host = host;
    this._port = port;
    this._user = user;
    this._password = password;
    this._remotePath = remotePath.endsWith('/') ? remotePath.slice(0, -1) : remotePath;
    this._publicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
    this._secure = secure;
    this._passiveMode = passiveMode;
  }

  /**
   * Create and configure FTP client connection
   * @returns Promise<ftp.Client> - Configured FTP client
   */
  private async createFTPClient(): Promise<ftp.Client> {
    const client = new ftp.Client();

    try {
      // Configure connection timeout and keep-alive
      client.ftp.timeout = 30000; // 30 seconds timeout

      await client.access({
        host: this._host,
        port: this._port,
        user: this._user,
        password: this._password,
        secure: this._secure,
        secureOptions: this._secure ? { rejectUnauthorized: false } : undefined,
      });

      // Set passive mode
      client.ftp.pasv = this._passiveMode;

      return client;
    } catch (error) {
      client.close();
      throw new Error(`Failed to connect to FTP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Ensure directory exists on FTP server, creating if necessary
   * @param client - FTP client
   * @param dirPath - Directory path to create
   */
  private async ensureDirectory(client: ftp.Client, dirPath: string): Promise<void> {
    try {
      await client.ensureDir(dirPath);
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a file from a URL via FTP
   * @param path - URL of the file to upload
   * @returns Promise<string> - The public URL where the uploaded file can be accessed
   */
  async uploadSimple(path: string): Promise<string> {
    let client: ftp.Client | null = null;

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

      // Connect to FTP server
      client = await this.createFTPClient();

      // Ensure directory exists
      await this.ensureDirectory(client, remoteDir);

      // Create readable stream from buffer
      const stream = Readable.from(response.data);

      // Upload file
      await client.uploadFrom(stream, remoteFilePath);

      return `${this._publicUrl}/${publicPath}`;
    } catch (error) {
      console.error('Error uploading file via FTP uploadSimple:', error);
      throw new Error(`Failed to upload file from ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.close();
      }
    }
  }

  /**
   * Upload a file from form data via FTP
   * @param file - The uploaded file object
   * @returns Promise<any> - File information including the public access URL
   */
  async uploadFile(file: Express.Multer.File): Promise<any> {
    let client: ftp.Client | null = null;

    try {
      // Generate file path
      const datePath = this.generateDatePath();
      const id = makeId(10);
      const extension = mime.extension(file.mimetype) || 'bin';
      const fileName = `${id}.${extension}`;
      const remoteDir = `${this._remotePath}/${datePath}`;
      const remoteFilePath = `${remoteDir}/${fileName}`;
      const publicPath = `${datePath}/${fileName}`;

      // Connect to FTP server
      client = await this.createFTPClient();

      // Ensure directory exists
      await this.ensureDirectory(client, remoteDir);

      // Create readable stream from buffer
      const stream = Readable.from(file.buffer);

      // Upload file
      await client.uploadFrom(stream, remoteFilePath);

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
      console.error('Error uploading file via FTP uploadFile:', error);
      throw new Error(`Failed to upload file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.close();
      }
    }
  }

  /**
   * Remove a file from FTP storage
   * @param filePath - The public URL of the file to remove
   * @returns Promise<void>
   */
  async removeFile(filePath: string): Promise<void> {
    let client: ftp.Client | null = null;

    try {
      // Extract relative path from public URL
      const relativePath = filePath.replace(this._publicUrl + '/', '');
      const remoteFilePath = `${this._remotePath}/${relativePath}`;

      // Connect to FTP server
      client = await this.createFTPClient();

      // Remove file
      await client.remove(remoteFilePath);
    } catch (error) {
      console.error('Error removing file via FTP:', error);
      // Don't throw error for file removal failures to avoid breaking the application
      // Just log the error as the file might already be deleted or not exist
      console.warn(`Failed to remove file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.close();
      }
    }
  }
}