import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Queue } from 'bullmq';
import { ioRedis } from '../redis/redis.service';

export class BullMqClient extends ClientProxy {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private queue: Queue;

  override async connect() {
    return;
  }

  async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    this.queue = this.queue || new Queue(packet.pattern, { connection: ioRedis });
    return this.queue.add('default', packet.data);
  }

  override close(): any {
    return this.queue.close();
  }

  protected publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void
  ): () => void {
    return () => {
      return;
    };
  }
}
