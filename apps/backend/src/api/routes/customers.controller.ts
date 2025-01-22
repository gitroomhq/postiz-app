import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
import { CustomerDto } from '@gitroom/nestjs-libraries/dtos/customers/customers';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CustomersService } from '@gitroom/nestjs-libraries/database/prisma/customers/customers.service';

@ApiTags('Customers')
@Controller('/customers')
export class CustomersController {
  constructor(private _customersService: CustomersService) {}

  @Get('/')
  getPlatformConfigList(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
  ) {
    return this._customersService.getCustomerList(organization.id);
  }

  @Post('/')
  createCustomer(
    @GetOrgFromRequest() organization: Organization,
    @Body() customerDto: CustomerDto
  ) {
    customerDto.orgId = organization.id;
    return this._customersService.createCustomer(customerDto, organization.id);
  }

  @Get('/:id')
  getPlatformConfig(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
  ) {
    return this._customersService.getCustomerById(id, organization.id);
  }

  @Put('/:id')
  async updateCustomer(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
    @Body() customerDto: CustomerDto,
  ) {
    customerDto.orgId = organization.id;
    return this._customersService.updateCustomer(id, customerDto, organization.id);
  }


  @Delete('/:id')
  async deleteCustomer(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
  ) {
    return this._customersService.deleteCustomer(id, organization.id);
  }
}
