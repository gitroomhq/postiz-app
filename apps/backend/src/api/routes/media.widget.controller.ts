import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { streamUploadOptions } from '@gitroom/nestjs-libraries/upload/multer.stream.engine';

@ApiTags('Media')
@Controller('/media-widget')
export class MediaWidgetController {
  constructor(private _mediaService: MediaService) {}

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file', streamUploadOptions()))
  async upload(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this._mediaService.saveUploadSessionFile(
      org.id,
      // @ts-ignore
      req.uploadSession,
      file.filename,
      file.path,
      file.originalname
    );
  }

  @Get('/status')
  status(@GetOrgFromRequest() org: Organization, @Req() req: Request) {
    // @ts-ignore
    return this._mediaService.getUploadSession(org.id, req.uploadSession);
  }
}
