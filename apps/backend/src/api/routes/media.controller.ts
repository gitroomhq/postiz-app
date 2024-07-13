import {
  Controller, Get, Param, Post, Query, Req, Res
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ApiTags } from '@nestjs/swagger';
import handleR2Upload from '@gitroom/nestjs-libraries/upload/r2.uploader';

@ApiTags('Media')
@Controller('/media')
export class MediaController {
  constructor(private _mediaService: MediaService) {}
  @Post('/:endpoint')
  // @UseInterceptors(FileInterceptor('file'))
  // @UsePipes(new CustomFileValidationPipe())
  async uploadFile(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Res() res: Response,
    @Param('endpoint') endpoint: string
    // @UploadedFile('file')
    // file: Express.Multer.File
  ) {
    const upload = await handleR2Upload(endpoint, req, res);
    if (endpoint !== 'complete-multipart-upload') {
      return upload;
    }

    // @ts-ignore
    const name = upload.Location.split('/').pop();

    // @ts-ignore
    await this._mediaService.saveFile(org.id, name, upload.Location);

    res.status(200).json(upload);
    // const filePath =
    //   file.path.indexOf('http') === 0
    //     ? file.path
    //     : file.path.replace(process.env.UPLOAD_DIRECTORY, '');
    // return this._mediaService.saveFile(org.id, file.originalname, filePath);
  }

  @Get('/')
  getMedia(
    @GetOrgFromRequest() org: Organization,
    @Query('page') page: number
  ) {
    return this._mediaService.getMedia(org.id, page);
  }
}
