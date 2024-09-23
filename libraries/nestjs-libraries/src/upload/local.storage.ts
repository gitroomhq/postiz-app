import { IUploadProvider } from './upload.interface';
import { mkdirSync, unlink, writeFileSync } from 'fs';
import { extname } from 'path';

export class LocalStorage implements IUploadProvider {
    constructor(private uploadDirectory: string) {}
    
    async uploadFile(file: Express.Multer.File): Promise<any> {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const dir = `${this.uploadDirectory}/${year}/${month}/${day}`;
        mkdirSync(dir, { recursive: true });

        const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');

        const filePath = `${dir}/${randomName}${extname(file.originalname)}`;
        // Logic to save the file to the filesystem goes here
        writeFileSync(filePath, file.buffer)

        return {
            filename: `${randomName}${extname(file.originalname)}`,
            path: filePath,
            mimetype: file.mimetype,
            originalname: file.originalname
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
