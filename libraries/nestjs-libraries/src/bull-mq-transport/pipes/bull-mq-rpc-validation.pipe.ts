import {
  ValidationError,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import {BullMqRpcValidationException} from "@gitroom/nestjs-libraries/bull-mq-transport/exceptions/bull-mq-rpc-validation.exception";

export class BullMqRpcValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      exceptionFactory: (
        errors: ValidationError[],
      ): BullMqRpcValidationException => {
        return new BullMqRpcValidationException(errors.toString());
      },
      ...options,
    });
  }
}
