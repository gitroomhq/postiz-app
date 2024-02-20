import { Global, Module } from '@nestjs/common';
import {MulterModule} from "@nestjs/platform-express";
import {diskStorage} from "multer";
import {mkdirSync} from 'fs';
import {extname} from 'path';

const storage = diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is zero-based, hence +1
    const day = String(now.getDate()).padStart(2, '0');

    const dir = `${process.env.UPLOAD_DIRECTORY}/${year}/${month}/${day}`;

    // Create the directory if it doesn't exist
    mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename here if needed
    const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
    cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

@Global()
@Module({
  imports: [
    MulterModule.register({
      storage
    }),
  ],
  get exports() {
    return this.imports;
  },
})
export class UploadModule {}
