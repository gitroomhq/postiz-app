import {DevToSettingsDto} from "@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto";
export const allProvidersSettings = [{
    identifier: 'devto',
    validator: DevToSettingsDto
}];

export type AllProvidersSettings = DevToSettingsDto;