import { Body, Controller, Get, Param, Post, HttpException, HttpStatus } from '@nestjs/common';
import { User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AgenciesService } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { CreateAgencyDto } from '@gitroom/nestjs-libraries/dtos/agencies/create.agency.dto';

@ApiTags('Agencies')
@Controller('/agencies')
export class AgenciesController {
  constructor(private _agenciesService: AgenciesService) {}

  // Get agency by user
  @Get('/')
  async getAgencyByUser(@GetUserFromRequest() user: User) {
    try {
      const agency = await this._agenciesService.getAgencyByUser(user);
      if (!agency) {
        throw new HttpException('Agency not found for this user', HttpStatus.NOT_FOUND);
      }
      return agency;
    } catch (error) {
      throw new HttpException('Error fetching agency', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Create a new agency
  @Post('/')
  async createAgency(
    @GetUserFromRequest() user: User,
    @Body() body: CreateAgencyDto
  ) {
    try {
      // Validate that the request body has required fields
      if (!body.name || !body.description) {
        throw new HttpException('Agency name and description are required', HttpStatus.BAD_REQUEST);
      }
      const createdAgency = await this._agenciesService.createAgency(user, body);
      return createdAgency;
    } catch (error) {
      throw new HttpException('Error creating agency', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update agency status based on action
  @Post('/action/:action/:id')
  async updateAgency(
    @GetUserFromRequest() user: User,
    @Param('action') action: string,
    @Param('id') id: string
  ) {
    try {
      // Check if the user is a super admin
      if (!user.isSuperAdmin) {
        throw new HttpException('Unauthorized access', HttpStatus.FORBIDDEN);
      }

      const result = await this._agenciesService.approveOrDecline(user.email, action, id);
      if (!result) {
        throw new HttpException('Action failed or agency not found', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      throw new HttpException('Error processing action', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
