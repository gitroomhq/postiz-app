import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { GetOrgFromRequest } from '@chaolaolo/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { SignatureService } from '@chaolaolo/nestjs-libraries/database/prisma/signatures/signature.service';
import { SignatureDto } from '@chaolaolo/nestjs-libraries/dtos/signature/signature.dto';

@ApiTags('Signatures')
@Controller('/signatures')
export class SignatureController {
  constructor(private _signatureService: SignatureService) { }

  @Get('/')
  async getSignatures(@GetOrgFromRequest() org: Organization) {
    return this._signatureService.getSignaturesByOrgId(org.id);
  }

  @Get('/default')
  async getDefaultSignature(@GetOrgFromRequest() org: Organization) {
    return (await this._signatureService.getDefaultSignature(org.id)) || {};
  }

  @Post('/')
  async createSignature(
    @GetOrgFromRequest() org: Organization,
    @Body() body: SignatureDto
  ) {
    return this._signatureService.createOrUpdateSignature(org.id, body);
  }

  @Put('/:id')
  async updateSignature(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
    @Body() body: SignatureDto
  ) {
    return this._signatureService.createOrUpdateSignature(org.id, body, id);
  }
}
