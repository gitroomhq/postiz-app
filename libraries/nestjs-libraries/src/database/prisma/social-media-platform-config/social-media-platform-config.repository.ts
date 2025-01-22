import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { SocialMediaPlatformConfigDto } from '@gitroom/nestjs-libraries/dtos/social-media-platform/social-media-platform-config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SocialMediaPlatformConfigRepository {
  constructor(
    private _socialMediaPlatformConfig: PrismaRepository<'socialMediaPlatformConfig'>,
  ) {}

  // Method to update or create the platform config
  async updatePlatformConfig(
    platformKey: string,
    orgId: string,
    body: SocialMediaPlatformConfigDto,
  ) {
    const { platform, config , customerId} = body;
  
    // Check for an existing config using the compound unique key
    const existingConfig =
      await this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.findFirst({
        where: {
          platformKey :platformKey,
          organizationId: orgId,
          customerId : customerId,
        },
      });
  
    if (existingConfig) {
      // Update the existing config
      return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.update({
        where: {
          id: existingConfig.id,
        },
        data: {
          platform,
          config: {
            upsert: config.map((item) => ({
              where: {
                key_configId: {
                  key: item.key,
                  configId: existingConfig.id,
                },
              },
              update: {
                value: item.value,
              },
              create: {
                key: item.key,
                value: item.value,
              },
            })),
          },
        },
        include: {
          config: true, // Include the updated config items
        },
      });
    } else {
      // Create a new config
      return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.create({
        data: {
          platform,
          platformKey,
          organizationId: orgId,
          customerId: customerId,
          config: {
            create: config.map((item) => ({
              key: item.key,
              value: item.value,
            })),
          },
        },
        include: {
          config: true, // Include the newly created config items
        },
      });
    }
  }
  

  // Method to fetch the platform config
  async getPlatformConfig(
    platformKey: string,
    organizationId: string,
    customerId: string | undefined | null,
  ) {
    return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.findFirst({
      where: {
          platformKey,
          organizationId, 
          customerId
      },
      include: {
        config: true, // Include associated config items
      },
    });
  }


  // Method to fetch the platform config
  async getPlatformConfigList(organizationId: string, customerId:string|null) {
    return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.findMany({
      where: {
        organizationId, // Filter by organization ID
        customerId,
      },
      include: {
        config: true, // Include associated config items
      }
    });
  }
  
  
}
