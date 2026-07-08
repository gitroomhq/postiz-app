import {
  Global,
  Injectable,
  Logger,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
import { Connection } from '@temporalio/client';

@Injectable()
export class TemporalRegister implements OnModuleInit {
  private readonly _logger = new Logger(TemporalRegister.name);
  constructor(private _client: TemporalService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.TEMPORAL_TLS === 'true') {
      return;
    }

    // Registering Temporal search attributes must never block application
    // startup. If the Temporal frontend is unreachable (e.g. scaled to zero or
    // still starting up), the gRPC call rejects; letting that propagate aborts
    // the whole Nest init() so the HTTP server never binds its port and the pod
    // stays unready / crash-loops. Mirror the orchestrator's behaviour: log and
    // continue. Search attributes are re-checked on the next boot once Temporal
    // is back.
    try {
      const connection = this._client?.client?.getRawClient()
        ?.connection as Connection;

      if (!connection) {
        this._logger.warn(
          'Temporal connection unavailable; skipping search-attribute registration.'
        );
        return;
      }

      const { customAttributes } =
        await connection.operatorService.listSearchAttributes({
          namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        });

      const neededAttribute = ['organizationId', 'postId'];
      const missingAttributes = neededAttribute.filter(
        (attr) => !customAttributes[attr]
      );

      if (missingAttributes.length > 0) {
        await connection.operatorService.addSearchAttributes({
          namespace: process.env.TEMPORAL_NAMESPACE || 'default',
          searchAttributes: missingAttributes.reduce((all, current) => {
            // @ts-ignore
            all[current] = 1;
            return all;
          }, {}),
        });
      }
    } catch (err) {
      this._logger.warn(
        `Failed to register Temporal search attributes (Temporal may be unavailable); continuing startup. ${
          (err as Error)?.message ?? err
        }`
      );
    }
  }
}

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [TemporalRegister],
  get exports() {
    return this.providers;
  },
})
export class TemporalRegisterMissingSearchAttributesModule {}
