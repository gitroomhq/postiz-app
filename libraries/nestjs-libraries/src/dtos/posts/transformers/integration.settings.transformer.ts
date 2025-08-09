import { Transform, Type } from 'class-transformer';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegrationSettingsTransformer {
  constructor(private integrationService: IntegrationService) {}

  async transformPost(post: any, orgId: string) {
    if (!post.integration?.id || !post.settings) {
      return post;
    }

    try {
      // Get the integration from the database
      const integration = await this.integrationService.getIntegrationById(
        orgId,
        post.integration.id
      );

      if (integration?.providerIdentifier) {
        // Set the __type field based on the provider identifier
        post.settings.__type = integration.providerIdentifier;
      }
    } catch (error) {
      // If there's an error fetching the integration, we'll let validation handle it
      console.error('Error fetching integration for settings transform:', error);
    }

    return post;
  }
}

// Custom property transformer for individual Post objects
export const TransformIntegrationSettings = (orgId: string) => {
  return Transform(({ value, obj }) => {
    // This will be handled by the service layer instead of transformer
    // since we need async database access
    return value;
  });
}; 