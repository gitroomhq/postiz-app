import { RpcException } from '@nestjs/microservices';

export class BullMqRpcValidationException extends RpcException {
  override name = this.constructor.name;
}
