import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ConfigurationChecker } from '@gitroom/helpers/configuration/configuration.checker';

@Injectable()
export class ConfigurationTask {
  @Command({
    command: 'config:check',
    describe: 'Checks your configuration (.env) file for issues.',
  })
  create() {
    const checker = new ConfigurationChecker();
    checker.readEnvFromProcess();
    checker.check();

    checker.printSummary();

    if (checker.hasErrors()) {
      console.error(`\n❌ Configuration check failed with ${checker.getErrorCount()} error(s). Please fix the errors above.`);
      process.exit(1);
    } else if (checker.hasIssues()) {
      console.warn(`\n⚠️  Configuration check completed with ${checker.getWarningCount()} warning(s). Consider addressing the warnings above.`);
    } else {
      console.log('\n✅ Configuration check passed! All settings look good.');
    }

    console.log('Press Ctrl+C to exit.');
    return true;
  }
}
