/**
 * R2's S3 endpoint depends on whether the bucket was created with a
 * jurisdiction. A jurisdictional bucket — EU, for data residency under GDPR —
 * is reachable *only* through its own hostname; the account-wide endpoint
 * cannot see it at all, and the failure surfaces as a missing bucket rather
 * than anything that points at the endpoint being wrong.
 *
 * Jurisdiction is fixed when the bucket is created and cannot be changed
 * afterwards, so this has to match how the bucket was made.
 *
 * Left unset, this returns the account-wide endpoint — the behaviour every
 * existing install already has.
 */
export function r2Endpoint(accountId: string, jurisdiction?: string): string {
  const jur = (jurisdiction || '').trim().toLowerCase();
  return jur
    ? `https://${accountId}.${jur}.r2.cloudflarestorage.com`
    : `https://${accountId}.r2.cloudflarestorage.com`;
}
