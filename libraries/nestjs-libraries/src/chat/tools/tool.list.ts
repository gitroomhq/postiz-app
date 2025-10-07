import { IntegrationValidationTool } from '@gitroom/nestjs-libraries/chat/tools/integration.validation.tool';
import { IntegrationTriggerTool } from '@gitroom/nestjs-libraries/chat/tools/integration.trigger.tool';
import { IntegrationSchedulePostTool } from './integration.schedule.post';

export const toolList = [
  IntegrationValidationTool,
  IntegrationTriggerTool,
  IntegrationSchedulePostTool,
];
