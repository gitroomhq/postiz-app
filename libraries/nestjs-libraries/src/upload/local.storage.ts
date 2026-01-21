import { IUploadProvider } from './upload.interface';
import { mkdirSync, unlink, writeFileSync } from 'fs';
// @ts-ignore
import mime from 'mime';
import { extname } from 'path';
import axios from 'axios';

export class LocalStorage implements IUploadProvider {
  constructor(private uploadDirectory: string) {}

  async uploadSimple(path: string) {
    const loadImage = await axios.get(path, { responseType: 'arraybuffer' });
    const contentType =
      loadImage?.headers?.['content-type'] ||
      loadImage?.headers?.['Content-Type'];
    // Fallback to 'bin' if MIME type is unrecognized, or try to extract from URL
    const findExtension = mime.getExtension(contentType) || path.split('.').pop()?.split('?')[0] || 'bin';

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const innerPath = `/${year}/${month}/${day}`;
    const dir = `${this.uploadDirectory}${innerPath}`;
    mkdirSync(dir, { recursive: true });

    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');

    const filePath = `${dir}/${randomName}.${findExtension}`;
    const publicPath = `${innerPath}/${randomName}.${findExtension}`;
    // Logic to save the file to the filesystem goes here
    writeFileSync(filePath, loadImage.data);

    return process.env.FRONTEND_URL + '/uploads' + publicPath;
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const innerPath = `/${year}/${month}/${day}`;
      const dir = `${this.uploadDirectory}${innerPath}`;
      mkdirSync(dir, { recursive: true });

      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');

      const filePath = `${dir}/${randomName}${extname(file.originalname)}`;
      const publicPath = `${innerPath}/${randomName}${extname(
        file.originalname
      )}`;

      // Logic to save the file to the filesystem goes here
      writeFileSync(filePath, file.buffer);

      return {
        filename: `${randomName}${extname(file.originalname)}`,
        path: process.env.FRONTEND_URL + '/uploads' + publicPath,
        mimetype: file.mimetype,
        originalname: file.originalname,
      };
    } catch (err) {
      console.error('Error uploading file to Local Storage:', err);
      throw err;
    }
  }

  async removeFile(filePath: string): Promise<void> {
    // Convert URL to filesystem path
    // Input: http://localhost:4200/uploads/2025/01/15/abc123.png
    // Output: /upload-directory/2025/01/15/abc123.png
    try {
      const url = new URL(filePath);
      const pathAfterUploads = url.pathname.replace(/^\/uploads/, '');
      const fsPath = `${this.uploadDirectory}${pathAfterUploads}`;

      return new Promise((resolve, reject) => {
        unlink(fsPath, (err) => {
          if (err) {
            // Don't reject if file doesn't exist
            if (err.code === 'ENOENT') {
              console.log(`File not found (already deleted?): ${fsPath}`);
              resolve();
            } else {
              console.error(`Error deleting file from local storage: ${fsPath}`, err);
              reject(err);
            }
          } else {
            console.log(`Successfully deleted file: ${fsPath}`);
            resolve();
          }
        });
      });
    } catch (parseError) {
      console.error(`Error parsing file URL: ${filePath}`, parseError);
      // If filePath is not a valid URL, try it as a direct path
      return new Promise((resolve, reject) => {
        unlink(filePath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error(`Error deleting file: ${filePath}`, err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}
