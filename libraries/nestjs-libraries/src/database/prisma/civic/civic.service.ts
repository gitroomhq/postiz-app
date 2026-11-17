import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  ApproveCivicCampaignDto,
  CreateCivicCampaignDto,
  LinkPublishedCivicPostDto,
} from '@gitroom/nestjs-libraries/dtos/civic/create.civic.campaign.dto';

const copyByTheme: Record<string, { en: string; hi: string }> = {
  check_voter_list: { en: 'Check your public voter-list details using official sources.', hi: 'आधिकारिक स्रोतों से अपनी मतदाता सूची की जानकारी जांचें।' },
  polling_day: { en: 'Keep official polling-day information handy.', hi: 'मतदान दिवस की आधिकारिक जानकारी अपने पास रखें।' },
  find_booth: { en: 'Find polling-location information through official channels.', hi: 'आधिकारिक माध्यमों से मतदान स्थल की जानकारी प्राप्त करें।' },
  documents: { en: 'Review official document guidance before you travel.', hi: 'जाने से पहले आधिकारिक दस्तावेज़ मार्गदर्शन देखें।' },
  helpline: { en: 'Use the official helpline for public-information support.', hi: 'सार्वजनिक जानकारी के लिए आधिकारिक हेल्पलाइन का उपयोग करें।' },
  custom_civic: { en: 'Read the latest public information from official sources.', hi: 'आधिकारिक स्रोतों से नवीनतम सार्वजनिक जानकारी पढ़ें।' },
};

@Injectable()
export class CreativeService {
  create(input: CreateCivicCampaignDto) {
    const copy = copyByTheme[input.theme];
    const languageLine = input.language === 'hi' ? copy.hi : input.language === 'en' ? copy.en : `${copy.hi} ${copy.en}`;
    const dateLine = input.pollDate ? ` Before ${input.pollDate}.` : '';
    const sourceLine = input.officialUrl ? ` Official information: ${input.officialUrl}.` : '';
    const helpLine = input.helpline ? ` Help: ${input.helpline}.` : '';
    const headline = `${input.placeLabel}: public information`;
    const body = `${languageLine}${dateLine}${sourceLine}${helpLine}`;
    const watermark = input.demoWatermark !== false ? ' FICTIONAL DEMO.' : '';
    const caption = `${body}${watermark}`;
    const basePrompt = `Neutral public-information civic artwork in ${input.placeLabel}; empty headline band and empty footer band; no party symbol, no politician face, no vote-for lettering`;
    return {
      headline,
      body,
      caption,
      reelVO: `${languageLine}${sourceLine}${helpLine}`,
      imagePrompts: [
        `Photoreal poster, 1080x1080. ${basePrompt}.`,
        `Vertical story, 1080x1920. ${basePrompt}.`,
        `Flat infographic. ${basePrompt}.`,
      ],
    };
  }
}

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async approve(organizationId: string, id: string, approval: ApproveCivicCampaignDto) {
    const campaign = await this.prisma.civicCampaign.findFirst({ where: { id, organizationId }, include: { assets: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!campaign) throw new NotFoundException('Civic campaign not found');
    if (!approval.paidForBy.trim() || !approval.authorizedBy.trim() || !approval.approverName.trim()) throw new BadRequestException('Paid for by, authorized by, and approver name are required.');
    const asset = campaign.assets[0];
    if (!asset) throw new BadRequestException('Generate a civic asset before approval.');
    const isoTime = new Date().toISOString();
    const footer = `\n\nPublic information. Paid for by ${approval.paidForBy}. Authorized by ${approval.authorizedBy}.\nAI-assisted. Human approved ${approval.approverName} ${isoTime}.\n${campaign.demoWatermark ? 'FICTIONAL DEMO' : ''}`;
    await this.prisma.$transaction([
      this.prisma.civicCampaign.update({ where: { id }, data: { paidForBy: approval.paidForBy, authorizedBy: approval.authorizedBy, approverName: approval.approverName, status: 'approved' } }),
      this.prisma.civicAsset.update({ where: { id: asset.id }, data: { caption: `${asset.caption}${footer}` } }),
    ]);
    return this.prisma.civicCampaign.findUnique({ where: { id }, include: { assets: true, receipts: true } });
  }
}

@Injectable()
export class PublishService {
  constructor(private readonly prisma: PrismaService) {}

  // Publishing remains the existing Postiz Facebook workflow. This only links
  // a verified, already-published Page post and records its Graph identifiers.
  async linkPublishedPost(organizationId: string, campaignId: string, input: LinkPublishedCivicPostDto) {
    const campaign = await this.prisma.civicCampaign.findFirst({ where: { id: campaignId, organizationId } });
    if (!campaign || campaign.status !== 'approved') throw new BadRequestException('Approve the civic campaign before linking a Page post.');
    const post = await this.prisma.post.findFirst({ where: { id: input.postId, organizationId, state: 'PUBLISHED', integration: { providerIdentifier: 'facebook' } }, include: { integration: true } });
    if (!post) throw new BadRequestException('Select a Facebook Page post already published by Postiz.');
    const platformPostId = post.releaseId || post.id;
    const existing = await this.prisma.publishReceipt.findFirst({ where: { campaignId, postId: platformPostId } });
    const receipt = existing
      ? await this.prisma.publishReceipt.update({ where: { id: existing.id }, data: { pageId: post.integration.internalId, permalink: post.releaseURL, status: 'published', error: null } })
      : await this.prisma.publishReceipt.create({ data: { campaignId, platform: 'facebook', postId: platformPostId, pageId: post.integration.internalId, permalink: post.releaseURL, status: 'published' } });
    await this.prisma.civicCampaign.update({ where: { id: campaignId }, data: { status: 'published' } });
    return receipt;
  }
}

@Injectable()
export class CivicCampaignService {
  constructor(private readonly prisma: PrismaService, private readonly creative: CreativeService) {}

  async list(organizationId: string) {
    return this.prisma.civicCampaign.findMany({ where: { organizationId }, include: { assets: true, receipts: true }, orderBy: { updatedAt: 'desc' } });
  }

  async create(organizationId: string, input: CreateCivicCampaignDto) {
    const generated = this.creative.create(input);
    return this.prisma.civicCampaign.create({ data: {
      organizationId, theme: input.theme, placeLabel: input.placeLabel, language: input.language,
      pollDate: input.pollDate ? new Date(input.pollDate) : null, officialUrl: input.officialUrl, helpline: input.helpline,
      paidForBy: input.paidForBy, authorizedBy: input.authorizedBy, demoWatermark: input.demoWatermark !== false, status: 'in_review',
      assets: { create: { headline: generated.headline, body: generated.body, caption: generated.caption, reelVO: generated.reelVO, imagePrompts: JSON.stringify(generated.imagePrompts) } },
    }, include: { assets: true, receipts: true } });
  }

  async recordHandoff(organizationId: string, id: string) {
    const update = await this.prisma.civicCampaign.updateMany({ where: { id, organizationId, status: 'published' }, data: { handoffClickedAt: new Date() } });
    if (!update.count) throw new NotFoundException('Published civic campaign not found');
    return { handoffClickedAt: new Date().toISOString() };
  }
}
