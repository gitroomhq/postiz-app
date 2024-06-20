import {
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ApiTags } from '@nestjs/swagger';
import { CustomFileValidationPipe } from '@gitroom/nestjs-libraries/upload/custom.upload.validation';

@ApiTags('Media')
@Controller('/media')
export class MediaController {
  constructor(private _mediaService: MediaService) {}
  @Post('/')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new CustomFileValidationPipe())
  async uploadFile(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile('file')
    file: Express.Multer.File
  ) {
    const filePath =
      file.path.indexOf('http') === 0
        ? file.path
        : file.path.replace(process.env.UPLOAD_DIRECTORY, '');
    return this._mediaService.saveFile(org.id, file.originalname, filePath);
  }

  @Get('/')
  getMedia(
    @GetOrgFromRequest() org: Organization,
    @Query('page') page: number
  ) {
    return this._mediaService.getMedia(org.id, page);
  }
}
