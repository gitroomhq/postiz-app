import { Injectable } from '@nestjs/common';
import { MobileDeviceRepository } from '@gitroom/nestjs-libraries/database/prisma/mobile-devices/mobile-device.repository';
import { MobilePushTokenDto } from '@gitroom/nestjs-libraries/dtos/mobile/mobile-push-token.dto';
import type { NotificationType } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_CHUNK_SIZE = 100;

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

@Injectable()
export class MobilePushService {
  constructor(private _mobileDeviceRepository: MobileDeviceRepository) {}

  registerDevice(userId: string, organizationId: string, body: MobilePushTokenDto) {
    return this._mobileDeviceRepository.upsertDevice({
      userId,
      organizationId,
      platform: body.platform,
      pushToken: body.token,
      deviceId: body.deviceId,
      appVersion: body.appVersion,
      buildNumber: body.buildNumber,
      locale: body.locale,
      timezone: body.timezone,
    });
  }

  async deleteDevice(userId: string, organizationId: string, token: string) {
    await this._mobileDeviceRepository.deleteDevice(userId, organizationId, token);
    return { success: true };
  }

  async sendOrganizationNotification(
    organizationId: string,
    subject: string,
    message: string,
    type: NotificationType
  ) {
    const devices =
      await this._mobileDeviceRepository.getActiveDevicesForOrganization(
        organizationId
      );

    if (!devices.length) {
      return;
    }

    const body = this.toPushBody(message);
    const chunks = this.chunk(devices, EXPO_CHUNK_SIZE);

    for (const chunk of chunks) {
      const payload = chunk.map((device) => ({
        to: device.pushToken,
        title: subject || 'Postiz',
        body,
        sound: 'default',
        data: {
          route: '/(tabs)/notifications',
          type,
        },
      }));

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          continue;
        }

        const result = (await response.json()) as { data?: ExpoPushTicket[] };
        const invalidTokens =
          result.data
            ?.map((ticket, index) =>
              this.isInvalidToken(ticket) ? chunk[index]?.pushToken : undefined
            )
            .filter((token): token is string => !!token) ?? [];

        await this._mobileDeviceRepository.markTokensDeleted(invalidTokens);
      } catch (err) {}
    }
  }

  private isInvalidToken(ticket?: ExpoPushTicket) {
    return (
      ticket?.status === 'error' &&
      ['DeviceNotRegistered', 'InvalidCredentials'].includes(
        ticket.details?.error || ''
      )
    );
  }

  private toPushBody(value: string) {
    return value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
  }

  private chunk<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
