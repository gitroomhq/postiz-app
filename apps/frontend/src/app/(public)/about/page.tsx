import { Metadata } from 'next';
import { ManifestoOpening } from '@gitroom/frontend/components/about/ManifestoOpening';
import { StoryTimeline } from '@gitroom/frontend/components/about/StoryTimeline';
import { FivePillars } from '@gitroom/frontend/components/about/FivePillars';
import { TransparencyManifesto } from '@gitroom/frontend/components/about/TransparencyManifesto';
import { ClosingMission } from '@gitroom/frontend/components/about/ClosingMission';

export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    'About D3 — A creator growth ecosystem and commercial IP operating company.',
  description:
    'Since 2021, D3 has been building creators, founders, and commercial IPs across Malaysia. Not vanity. Not motivation. Real execution: content, audience, platform, positioning, monetization.',
};

export default function AboutPage() {
  return (
    // Full-bleed: break out of the layout's max-w-[1200px] wrapper so every
    // section shares one viewport-centered column (and the hero particles span
    // edge-to-edge like the landing hero). Each section re-centers its own
    // max-w-[1100px] px-6 column, so they all align at every width.
    <article className="flex flex-col w-screen ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]">
      <ManifestoOpening />
      <StoryTimeline />
      <FivePillars />
      <TransparencyManifesto />
      <ClosingMission />
    </article>
  );
}
