import {Global, Module} from '@nestjs/common';
import module from './plugins';

@Global()
@Module({
  imports: [...module],
  controllers: [],
  providers: [],
  get exports() {
    return [...this.imports];
  }
})
export class PluginModule {}
