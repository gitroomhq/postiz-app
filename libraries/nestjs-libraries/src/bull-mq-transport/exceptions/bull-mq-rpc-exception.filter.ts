import {
  ArgumentsHost,
  Catch,
  Inject,
  InternalServerErrorException,
  Logger,
  LogLevel,
  RpcExceptionFilter,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { Observable, of, throwError } from 'rxjs';
import { BULLMQ_MODULE_OPTIONS } from '../constants/bull-mq.constants';
import {IBullMqModuleOptions} from "@gitroom/nestjs-libraries/bull-mq-transport/interfaces/bull-mq-module-options.interface";

@Catch(RpcException)
export class BullMqRpcExceptionFilter
  extends BaseExceptionFilter
  implements RpcExceptionFilter<RpcException>
{
  private readonly logger = new Logger();

  constructor(
    @Inject(BULLMQ_MODULE_OPTIONS)
    private readonly options: IBullMqModuleOptions,
  ) {
    super();
  }

  override catch(exception: RpcException, host: ArgumentsHost): Observable<void> {
    if (host.getType() === 'http') {
      const err = new InternalServerErrorException(
        exception.message,
        exception.constructor.name,
      );
      if (exception.stack) {
        err.stack = exception.stack;
      }
      this.logException(err, host);
      return of(super.catch(err, host));
    }

    const err = {
      name: exception.name,
      error: exception.name,
      message: exception.message,
      stack: exception.stack || undefined,
    };

    this.logException(err, host);

    return throwError(() => err);
  }

  logException(exception: Error, host: ArgumentsHost): void {
    const defaultLogLevel: LogLevel = 'error';

    switch (this.options.logExceptionsAsLevel ?? defaultLogLevel) {
      case 'off':
        return;
      case 'log':
        return this.logger.log(exception.stack, host.getType());
      case 'error':
        return this.logger.error(
          exception.message,
          exception.stack,
          host.getType(),
        );
      case 'warn':
        return this.logger.warn(exception.stack, host.getType());
      case 'debug':
        return this.logger.debug(exception.stack, host.getType());
      case 'verbose':
        return this.logger.verbose(exception.stack, host.getType());
    }
  }
}
