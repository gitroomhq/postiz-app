import {
  Body, Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors, UsePipes
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ApiTags } from '@nestjs/swagger';
import handleR2Upload from '@gitroom/nestjs-libraries/upload/r2.uploader';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomFileValidationPipe } from '@gitroom/nestjs-libraries/upload/custom.upload.validation';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';

@ApiTags('Media')
@Controller('/media')
export class MediaController {
  private storage = UploadFactory.createStorage();
  constructor(
    private _mediaService: MediaService,
    private _subscriptionService: SubscriptionService
  ) {}

  @Post('/generate-image')
  async generateImage(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Body('prompt') prompt: string
  ) {
    const total = await this._subscriptionService.checkCredits(org);
    if (total.credits <= 0) {
      return false;
    }

    return {output: 'data:image/png;base64,' + await this._mediaService.generateImage(prompt, org)};
  }

  @Post('/upload-server')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new CustomFileValidationPipe())
  async uploadServer(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile() file: Express.Multer.File
  ) {
    const uploadedFile = await this.storage.uploadFile(file);
    return this._mediaService.saveFile(org.id, uploadedFile.originalname, uploadedFile.path);
  }

  @Post('/upload-simple')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSimple(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile('file') file: Express.Multer.File
  ) {
    const getFile = await this.storage.uploadFile(file);
    return this._mediaService.saveFile(org.id, getFile.originalname, getFile.path);
  }

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
