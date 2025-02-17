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
    const findExtension = mime.getExtension(contentType)!;

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

    console.log(`Saving file ${path} to ${filePath}`);

    try {
      writeFileSync(filePath, loadImage.data);
    } catch (error: any) {
      console.error(`Failed to save file ${path} to ${filePath}:`, error);
      throw new Error(`Failed to save file: ${error.message}`);
    }

    return process.env.FRONTEND_URL + '/uploads' + publicPath;
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
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

    console.log(`Saving file ${file.originalname} to ${filePath}`);

    try {
      writeFileSync(filePath, file.buffer);
    } catch (error: any) {
      console.error(
        `Failed to save file ${file.originalname} to ${filePath}:`,
        error
      );
      throw new Error(`Failed to save file: ${error.message}`);
    }

    return {
      filename: `${randomName}${extname(file.originalname)}`,
      path: process.env.FRONTEND_URL + '/uploads' + publicPath,
      mimetype: file.mimetype,
      originalname: file.originalname,
    };
  }

  async removeFile(filePath: string): Promise<void> {
    // Logic to remove the file from the filesystem goes here
    return new Promise((resolve, reject) => {
      unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
