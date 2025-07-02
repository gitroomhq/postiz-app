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

    if (checker.hasIssues()) {
      for (const issue of checker.getIssues()) {
        console.warn('Configuration issue:', issue);
      }

      console.error(
        'Configuration check complete, issues: ',
        checker.getIssuesCount()
      );
    } else {
      console.log('Configuration check complete, no issues found.');
    }

    console.log('Press Ctrl+C to exit.');
    return true;
  }
}
