import { Body, Controller, Get, Put, Post, Param, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  @Put('profile')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() body: { name?: string; timezone?: string; avatar?: string }) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Get('team')
  async getTeamMembers(@CurrentUser() user: AuthUser) {
    return this.usersService.getTeamMembers(user.organizationId);
  }

  @Post('team/invite')
  async inviteTeamMember(
    @CurrentUser() user: AuthUser,
    @Body() body: { email: string; role: 'ADMIN' | 'MEMBER' },
  ) {
    return this.usersService.inviteTeamMember(user.organizationId, body.email, body.role);
  }

  @Put('team/:userId/role')
  async updateTeamMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: { role: 'ADMIN' | 'MEMBER' },
  ) {
    return this.usersService.updateMemberRole(user.organizationId, userId, body.role);
  }

  @Delete('team/:userId')
  async removeTeamMember(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
  ) {
    return this.usersService.removeMember(user.organizationId, userId);
  }
}
