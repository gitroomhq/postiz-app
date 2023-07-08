import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { EncryptionService } from '@clickvote/nest-libraries';
import dayjs from 'dayjs';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private _encryptionService: EncryptionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const body = context.switchToWs().getData();
    if (!body.token) {
      return false;
    }

    try {
      const decrypted = JSON.parse(
        await this._encryptionService.decryptKey(
          body.token,
          process.env.TOKEN_KEY
        )
      );
      if (dayjs.unix(decrypted.expiration).isBefore(dayjs())) {
        return false;
      }

      client.key = decrypted.key;
      client.keyId = decrypted.id;
      return true;
    } catch (err) {
      return false;
    }
  }
}
