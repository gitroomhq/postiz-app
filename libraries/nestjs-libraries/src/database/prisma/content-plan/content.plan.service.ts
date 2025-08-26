import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ContentPlanRepository } from './content.plan.repository';
import { CompanyProfileService } from '../company-profile/company.profile.service';
import {
  GenerateContentPlanDto,
  CustomizeContentPlanDto,
  SaveTemplateDto,
  ContentPlanPreferencesDto
} from '../../../dtos/content-automation/request.dtos';
import { ContentPlan, ContentPlanStatus } from '@prisma/client';
import {
  WeeklySchedule,
  PlatformConfig,
  Platform,
  PostType,
  ContentCategory,
  ToneOfVoice,
  PostScheduleItem,
  DaySchedule
} from '../../../dtos/content-automation/interfaces';

@Injectable()
export class ContentPlanService {
  constructor(
    private contentPlanRepository: ContentPlanRepository,
    private companyProfileService: CompanyProfileService,
  ) { }

  private fromJsonValue<T>(value: unknown): T {
    return value as T;
  }

  async generatePlan(
    organizationId: string,
    data: GenerateContentPlanDto
  ): Promise<ContentPlan> {
    const companyProfile = await this.companyProfileService.getProfileById(data.companyProfileId, organizationId);
    if (!companyProfile || companyProfile.organizationId !== organizationId) {
      throw new NotFoundException('Company profile not found');
    }

    const existingPlan = await this.contentPlanRepository.findPlanByNameAndOrganization(
      data.name,
      organizationId
    );
    if (existingPlan) {
      throw new ConflictException('A content plan with this name already exists');
    }

    this.validatePlatforms(data.preferences.platforms);

    const weeklySchedule = this.generateWeeklySchedule(data.preferences);
    const platformConfig = this.generatePlatformConfig(data.preferences);

    return this.contentPlanRepository.createPlan(
      organizationId,
      data.companyProfileId,
      data,
      weeklySchedule,
      platformConfig
    );
  }

  async customizePlan(
    organizationId: string,
    planId: string,
    data: CustomizeContentPlanDto
  ): Promise<ContentPlan> {
    const plan = await this.getPlanById(organizationId, planId);

    if (plan.status === ContentPlanStatus.ACTIVE) {
      throw new BadRequestException('Cannot customize an active content plan. Please deactivate it first.');
    }

    if (data.modifications && data.modifications.length > 0) {
      this.validatePlanModifications(data.modifications);
    }

    let updatedWeeklySchedule = this.fromJsonValue<WeeklySchedule>(plan.weeklySchedule);
    let updatedPlatformConfig = this.fromJsonValue<PlatformConfig>(plan.platformConfig);

    if (data.weeklySchedule) {
      updatedWeeklySchedule = data.weeklySchedule;
    }

    if (data.platformConfig) {
      updatedPlatformConfig = data.platformConfig;
    }

    if (data.modifications && data.modifications.length > 0) {
      updatedWeeklySchedule = this.applyModificationsToSchedule(
        updatedWeeklySchedule,
        data.modifications
      );
    }

    const customizeData: CustomizeContentPlanDto = {
      modifications: data.modifications || [],
      weeklySchedule: updatedWeeklySchedule,
      platformConfig: updatedPlatformConfig,
    };

    return this.contentPlanRepository.customizePlan(planId, customizeData);
  }

  async activatePlan(organizationId: string, planId: string): Promise<ContentPlan> {
    const plan = await this.getPlanById(organizationId, planId);

    if (plan.status === ContentPlanStatus.ACTIVE) {
      throw new BadRequestException('Content plan is already active');
    }

    await this.contentPlanRepository.deactivateAllPlansForOrganization(organizationId);

    return this.contentPlanRepository.activatePlan(planId);
  }

  async deactivatePlan(organizationId: string, planId: string): Promise<ContentPlan> {
    const plan = await this.getPlanById(organizationId, planId);

    if (plan.status !== ContentPlanStatus.ACTIVE) {
      throw new BadRequestException('Content plan is not currently active');
    }

    return this.contentPlanRepository.deactivatePlan(planId);
  }

  async saveAsTemplate(
    organizationId: string,
    planId: string,
    templateData: SaveTemplateDto
  ): Promise<ContentPlan> {
    const plan = await this.getPlanById(organizationId, planId);

    const existingTemplate = await this.contentPlanRepository.findPlanByNameAndOrganization(
      templateData.name,
      organizationId
    );
    if (existingTemplate) {
      throw new ConflictException('A template with this name already exists');
    }

    return this.contentPlanRepository.saveAsTemplate(planId, templateData);
  }

  async getActivePlan(organizationId: string): Promise<ContentPlan | null> {
    return this.contentPlanRepository.getActivePlan(organizationId);
  }

  async getPlanHistory(organizationId: string): Promise<ContentPlan[]> {
    return this.contentPlanRepository.getPlansByOrganization(organizationId);
  }

  async getPlanById(organizationId: string, planId: string): Promise<ContentPlan> {
    const plan = await this.contentPlanRepository.getPlanById(planId);

    if (!plan || plan.organizationId !== organizationId) {
      throw new NotFoundException('Content plan not found');
    }

    return plan;
  }

  async getTemplates(organizationId: string): Promise<ContentPlan[]> {
    return this.contentPlanRepository.getTemplatesByOrganization(organizationId);
  }

  async deletePlan(organizationId: string, planId: string): Promise<void> {
    const plan = await this.getPlanById(organizationId, planId);

    if (plan.status === ContentPlanStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active content plan. Please deactivate it first.');
    }

    await this.contentPlanRepository.deletePlan(planId);
  }

  async duplicatePlan(
    organizationId: string,
    planId: string,
    newName: string
  ): Promise<ContentPlan> {
    await this.getPlanById(organizationId, planId);

    const existingPlan = await this.contentPlanRepository.findPlanByNameAndOrganization(
      newName,
      organizationId
    );
    if (existingPlan) {
      throw new ConflictException('A content plan with this name already exists');
    }

    return this.contentPlanRepository.duplicatePlan(planId, newName);
  }

  async getPlansByStatus(
    organizationId: string,
    status: ContentPlanStatus
  ): Promise<ContentPlan[]> {
    return this.contentPlanRepository.getPlansByStatus(organizationId, status);
  }

  async getPlansByCompanyProfile(
    organizationId: string,
    companyProfileId: string
  ): Promise<ContentPlan[]> {
    const companyProfile = await this.companyProfileService.getProfileById(companyProfileId, organizationId);
    if (!companyProfile || companyProfile.organizationId !== organizationId) {
      throw new NotFoundException('Company profile not found');
    }

    return this.contentPlanRepository.getPlansByCompanyProfile(companyProfileId);
  }

  private validatePlatforms(platforms: Platform[]): void {
    const supportedPlatforms = Object.values(Platform);
    const invalidPlatforms = platforms.filter(p => !supportedPlatforms.includes(p));

    if (invalidPlatforms.length > 0) {
      throw new BadRequestException(`Unsupported platforms: ${invalidPlatforms.join(', ')}`);
    }
  }

  private validatePlanModifications(modifications: any[]): void {
    for (const mod of modifications) {
      if (mod.action === 'add' && (!mod.platform || !mod.postType || !mod.contentCategory)) {
        throw new BadRequestException('Missing required fields for adding new post');
      }

      if (mod.scheduledTime && !this.isValidTimeFormat(mod.scheduledTime)) {
        throw new BadRequestException('Invalid time format. Use HH:mm format');
      }
    }
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private generateWeeklySchedule(preferences: ContentPlanPreferencesDto): WeeklySchedule {
    const schedule: WeeklySchedule = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const postsPerDay = preferences.customSchedulingPreferences?.postsPerDay || 2;
    const preferredTimes = preferences.customSchedulingPreferences?.preferredTimes || ['09:00', '15:00'];
    const avoidWeekends = preferences.customSchedulingPreferences?.avoidWeekends || false;

    days.forEach((day, index) => {
      if (avoidWeekends && (day === 'saturday' || day === 'sunday')) {
        schedule[day] = { posts: [] };
        return;
      }

      const dayPosts: PostScheduleItem[] = [];

      for (let i = 0; i < postsPerDay; i++) {
        const platform = preferences.platforms[i % preferences.platforms.length];
        const postType = this.getDefaultPostTypeForPlatform(platform);
        const contentCategory = preferences.preferredCategories?.[i % (preferences.preferredCategories?.length || 1)] || ContentCategory.EDUCATIONAL;
        const toneOfVoice = preferences.defaultToneOfVoice || ToneOfVoice.PROFESSIONAL;
        const scheduledTime = preferredTimes[i % preferredTimes.length];

        dayPosts.push({
          id: `${day}-${i}-${Date.now()}`,
          platform,
          postType,
          contentCategory,
          toneOfVoice,
          scheduledTime,
          isLocked: false,
        });
      }

      schedule[day] = { posts: dayPosts };
    });

    return schedule;
  }

  private generatePlatformConfig(preferences: ContentPlanPreferencesDto): PlatformConfig {
    const config: PlatformConfig = {};

    preferences.platforms.forEach(platform => {
      config[platform] = {
        enabled: true,
        postTypes: this.getAvailablePostTypesForPlatform(platform),
        optimalTimes: this.getOptimalTimesForPlatform(platform),
        dailyLimit: this.getDailyLimitForPlatform(platform),
      };
    });

    return config;
  }

  private getDefaultPostTypeForPlatform(platform: Platform): PostType {
    const platformDefaults: Record<Platform, PostType> = {
      [Platform.TWITTER]: PostType.TWEET,
      [Platform.INSTAGRAM]: PostType.FEED_POST,
      [Platform.FACEBOOK]: PostType.STATUS_UPDATE,
      [Platform.LINKEDIN]: PostType.UPDATE,
      [Platform.TIKTOK]: PostType.VIDEO,
      [Platform.YOUTUBE]: PostType.SHORT,
      [Platform.PINTEREST]: PostType.PIN,
      [Platform.THREADS]: PostType.TEXT_POST,
    };

    return platformDefaults[platform] || PostType.TWEET;
  }

  private getAvailablePostTypesForPlatform(platform: Platform): PostType[] {
    const platformPostTypes: Record<Platform, PostType[]> = {
      [Platform.TWITTER]: [PostType.TWEET, PostType.THREAD, PostType.RETWEET],
      [Platform.INSTAGRAM]: [PostType.FEED_POST, PostType.STORY, PostType.REEL, PostType.CAROUSEL],
      [Platform.FACEBOOK]: [PostType.STATUS_UPDATE, PostType.PHOTO_POST, PostType.VIDEO_POST, PostType.LINK_POST],
      [Platform.LINKEDIN]: [PostType.ARTICLE, PostType.UPDATE, PostType.POLL],
      [Platform.TIKTOK]: [PostType.VIDEO],
      [Platform.YOUTUBE]: [PostType.SHORT, PostType.COMMUNITY_POST],
      [Platform.PINTEREST]: [PostType.PIN, PostType.IDEA_PIN],
      [Platform.THREADS]: [PostType.TEXT_POST, PostType.IMAGE_POST],
    };

    return platformPostTypes[platform] || [PostType.TWEET];
  }

  private getOptimalTimesForPlatform(platform: Platform): string[] {
    const platformOptimalTimes: Record<Platform, string[]> = {
      [Platform.TWITTER]: ['09:00', '12:00', '15:00', '18:00'],
      [Platform.INSTAGRAM]: ['11:00', '13:00', '17:00', '19:00'],
      [Platform.FACEBOOK]: ['09:00', '13:00', '15:00'],
      [Platform.LINKEDIN]: ['08:00', '12:00', '17:00'],
      [Platform.TIKTOK]: ['06:00', '10:00', '19:00', '20:00'],
      [Platform.YOUTUBE]: ['14:00', '16:00', '20:00'],
      [Platform.PINTEREST]: ['08:00', '11:00', '20:00', '21:00'],
      [Platform.THREADS]: ['09:00', '12:00', '15:00', '18:00'],
    };

    return platformOptimalTimes[platform] || ['09:00', '15:00'];
  }

  private getDailyLimitForPlatform(platform: Platform): number {
    const platformLimits: Record<Platform, number> = {
      [Platform.TWITTER]: 5,
      [Platform.INSTAGRAM]: 3,
      [Platform.FACEBOOK]: 2,
      [Platform.LINKEDIN]: 2,
      [Platform.TIKTOK]: 3,
      [Platform.YOUTUBE]: 1,
      [Platform.PINTEREST]: 10,
      [Platform.THREADS]: 5,
    };

    return platformLimits[platform] || 2;
  }

  private applyModificationsToSchedule(
    schedule: WeeklySchedule,
    modifications: any[]
  ): WeeklySchedule {
    const updatedSchedule = { ...schedule };

    modifications.forEach(mod => {
      const { postId, action } = mod;

      if (action === 'delete') {
        Object.keys(updatedSchedule).forEach(day => {
          updatedSchedule[day].posts = updatedSchedule[day].posts.filter(
            post => post.id !== postId
          );
        });
      } else if (action === 'update') {
        Object.keys(updatedSchedule).forEach(day => {
          const postIndex = updatedSchedule[day].posts.findIndex(
            post => post.id === postId
          );

          if (postIndex !== -1) {
            updatedSchedule[day].posts[postIndex] = {
              ...updatedSchedule[day].posts[postIndex],
              ...mod,
            };
          }
        });
      } else if (action === 'add') {
        const firstDay = Object.keys(updatedSchedule)[0];
        if (firstDay) {
          const newPost: PostScheduleItem = {
            id: `new-${Date.now()}-${Math.random()}`,
            platform: mod.platform,
            postType: mod.postType,
            contentCategory: mod.contentCategory,
            toneOfVoice: mod.toneOfVoice || ToneOfVoice.PROFESSIONAL,
            scheduledTime: mod.scheduledTime || '12:00',
            isLocked: false,
          };

          updatedSchedule[firstDay].posts.push(newPost);
        }
      }
    });

    return updatedSchedule;
  }
}