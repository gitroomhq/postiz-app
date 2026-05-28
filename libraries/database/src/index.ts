/**
 * @d3/database — public surface.
 *
 * Server-side data access. NEVER import from browser code (this pulls in
 * the service_role client).
 *
 * Public read paths for the frontend will get a separate publishable-key
 * client wired in apps/frontend (Task 5).
 */

export { getSupabaseAdmin } from './supabase-server';
export {
  detectPlatform,
  normalizeHandle,
  validateProfileUrl,
  type ProfileUrlValidation,
  type ProfileUrlValidationError,
} from './profile-url';
export { addProfile, type AddProfileInput } from './profile';
export {
  addProfileClaim,
  decideInitialClaimKind,
  findCandidatesByHandle,
  findOrCreateProfile,
  type AddClaimInput,
  type FindOrCreateInput,
  type FindOrCreateResult,
} from './claim';
export {
  listScrapeableProfiles,
  upsertProfileSnapshot,
  upsertPostSnapshots,
  setProfileStatus,
  type ProfileSnapshotInput,
  type PostSnapshotInput,
} from './snapshots';
export type {
  Platform,
  ScrapeStatus,
  ClientRow,
  CreatorRow,
  ProfileRow,
  ProfileSnapshotRow,
  PostSnapshotRow,
  ProfileClaimRow,
  ClaimKind,
  ClaimedVia,
  DiscoveryCandidate,
  Result,
} from './types';
