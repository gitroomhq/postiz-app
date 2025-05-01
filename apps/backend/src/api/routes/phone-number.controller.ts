import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { randomInt } from 'node:crypto';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';

@ApiTags('Phone Number')
@Controller('/phone-number')
export class PhoneNumberController {
  constructor(
    private _userService: UsersService,
  ) { }

  @Post('/send-code')
  async sendVerificationCode(
    @GetUserFromRequest() user: User,
    @Body('phoneNumber') phoneNumber: string,
) {
    if (!phoneNumber) {
      throw new HttpException('phoneNumber required', 400);
    }

    const isAvailable = await this._userService.isPhoneNumberAvailable(phoneNumber)

    if(!isAvailable) {
        throw new HttpException('phoneNumber already exists', 400);
    }

    const code = randomInt(100000, 999999).toString();
    await ioRedis.set(`verify:${phoneNumber}`, code, 'EX', 300 * 3); // 15 min

    const snsClient = new SNSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PublishCommand({
      Message: `Your verification code: ${code}`,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });

    await this._userService.updatePhoneNumber(user.id, phoneNumber, false)

    await snsClient.send(command);

    return { success: true, message: 'Code sent' };
  }

  @Post('/verify-code')
  async verifyCode(
    @GetUserFromRequest() user: User,
    @Body('phoneNumber') phoneNumber: string,
    @Body('code') code: string,
  ) {
    if (!phoneNumber || !code) {
      throw new HttpException('Datos incompletos', 400);
    }

    const isAvailable = await this._userService.isPhoneNumberAvailable(phoneNumber)

    if(!isAvailable) {
        throw new HttpException('phoneNumber already exists', 400);
    }

    const storedCode = await ioRedis.get(`verify:${phoneNumber}`);
    const verified = storedCode === code;

    if (!verified) {
      throw new HttpException('Código incorrecto o expirado', 400);
    }

    await ioRedis.del(`verify:${phoneNumber}`);

    await this._userService.updatePhoneNumber(user.id, phoneNumber, true)

    return { success: true, verified };
  }


  @Post('/change/send-code')
  async changeSendVerificationCode(
    @GetUserFromRequest() user: User,
    @Body('phoneNumber') phoneNumber: string,
) {
    if (!phoneNumber) {
      throw new HttpException('phoneNumber required', 400);
    }

    const isAvailable = await this._userService.isPhoneNumberAvailable(phoneNumber, user.id)

    if(!isAvailable) {
        throw new HttpException('phoneNumber already exists', 400);
    }

    const code = randomInt(100000, 999999).toString();
    await ioRedis.set(`change:verify:${phoneNumber}`, code, 'EX', 300 * 3); // 15 min

    const snsClient = new SNSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PublishCommand({
      Message: `Your verification code: ${code}`,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });

    await this._userService.updatePhoneNumber(user.id, phoneNumber, false)

    await snsClient.send(command);

    return { success: true, message: 'Code sent' };
  }

  @Post('/change/verify-code')
  async changeVerifyCode(
    @GetUserFromRequest() user: User,
    @Body('phoneNumber') phoneNumber: string,
    @Body('code') code: string,
  ) {
    if (!phoneNumber || !code) {
      throw new HttpException('Datos incompletos', 400);
    }

    const isAvailable = await this._userService.isPhoneNumberAvailable(phoneNumber,  user.id)

    if(!isAvailable) {
        throw new HttpException('phoneNumber already exists', 400);
    }

    const storedCode = await ioRedis.get(`change:verify:${phoneNumber}`);
    const verified = storedCode === code;

    if (!verified) {
      throw new HttpException('Código incorrecto o expirado', 400);
    }

    await ioRedis.del(`change:verify:${phoneNumber}`);

    await this._userService.updatePhoneNumber(user.id, phoneNumber, true)

    return { success: true, verified };
  }
}
