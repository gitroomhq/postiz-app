import { Injectable } from '@nestjs/common';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

@Injectable()
export class CodesService {
  generateCodes(providerToken: string) {
    try {
      const decrypt = AuthService.fixedDecryption(providerToken);
      return [...new Array(10000)]
        .map((_, index) => {
          return AuthService.fixedEncryption(`${decrypt}:${index}`);
        })
        .join('\n');
    } catch (error) {
      return '';
    }
  }
}
