# AI Content Automation DTOs and Interfaces

This directory contains all TypeScript interfaces, DTOs, and types for the AI Content Automation feature.

## Files Overview

### `interfaces.ts`
Core interfaces and enums for the content automation system:
- `WeeklySchedule`, `DaySchedule`, `PostScheduleItem` - Content scheduling structures
- `PlatformConfig` - Platform-specific configuration
- `GenerationContext` - AI content generation context
- `CompanyProfileData` - Company profile data structure
- Platform, PostType, ContentCategory, ToneOfVoice enums

### `request.dtos.ts`
Data Transfer Objects for API requests:
- `CreateCompanyProfileDto` - Creating new company profiles
- `UpdateCompanyProfileDto` - Updating existing company profiles
- `GenerateContentPlanDto` - Generating new content plans
- `CustomizeContentPlanDto` - Customizing content plans
- `SaveTemplateDto` - Saving templates
- Various nested DTOs for complex data structures

### `response.dtos.ts`
Data Transfer Objects for API responses:
- `CompanyProfileResponseDto` - Company profile responses
- `ContentPlanResponseDto` - Content plan responses
- `AutomationLogResponseDto` - Automation log responses
- `UsageStatsResponseDto` - Usage tracking responses
- `AutomationDashboardResponseDto` - Dashboard data responses

### `validation.dtos.ts`
Additional DTOs for specific validation scenarios:
- `ValidateContentPlanDto` - Content plan validation
- `GeneratePostDto` - Single post generation
- `BulkGeneratePostsDto` - Bulk post generation
- `FilterAutomationLogsDto` - Log filtering
- `RetryFailedGenerationDto` - Retry operations

### `types.ts`
TypeScript type definitions and utility types:
- API response wrapper types
- Complex type combinations with relations
- Job queue types
- Error types
- Dashboard metrics types
- Template types

## Usage

```typescript
import {
  CreateCompanyProfileDto,
  CompanyProfileResponseDto,
  WeeklySchedule,
  GenerationContext,
  Platform,
  ContentCategory
} from '@gitroom/nestjs-libraries/dtos/content-automation';
```

## Validation

All DTOs use class-validator decorators for automatic validation:
- `@IsString()`, `@IsOptional()`, `@IsArray()` for basic validation
- `@IsEnum()` for enum validation
- `@ValidateNested()` for nested object validation
- `@MinLength()`, `@MaxLength()` for string length validation
- `@Min()`, `@Max()` for number range validation

## Requirements Mapping

This implementation satisfies the following requirements:
- **1.1**: Company profile management interfaces and DTOs
- **2.1**: Content plan generation interfaces and DTOs  
- **3.1**: Content plan customization interfaces and DTOs
- **4.1**: Template management interfaces and DTOs