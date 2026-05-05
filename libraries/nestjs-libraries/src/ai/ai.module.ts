import { Module } from '@nestjs/common';
import { AiCatalogService } from './ai-catalog.service';
import { AiCredentialRepository } from './ai-credential.repository';
import { AiCredentialService } from './ai-credential.service';
import { AiProviderTestService } from './ai-provider-test.service';

// DatabaseModule e Global e ja exporta PrismaRepository + EncryptionService.
@Module({
  providers: [
    AiCatalogService,
    AiCredentialRepository,
    AiCredentialService,
    AiProviderTestService,
  ],
  exports: [
    AiCatalogService,
    AiCredentialRepository,
    AiCredentialService,
    AiProviderTestService,
  ],
})
export class AiModule {}
