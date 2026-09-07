import { describe, expect, it } from 'vitest';
import { assertTestDatabase } from '@gitroom/testing/prisma/test.database';

describe('destructive-operation guard', () => {
  it('refuses a production-looking database', () => {
    expect(() =>
      assertTestDatabase('postgresql://u:p@db.example.com:5432/postiz-production')
    ).toThrow(/must contain "test"/);
  });

  it('refuses the local dev database', () => {
    expect(() =>
      assertTestDatabase('postgresql://postiz-local:x@localhost:5432/postiz-db-local')
    ).toThrow(/must contain "test"/);
  });

  it('refuses a missing url', () => {
    expect(() => assertTestDatabase('')).toThrow(/DATABASE_URL is required/);
  });

  it('accepts a test database', () => {
    expect(() =>
      assertTestDatabase('postgresql://u:p@localhost:5432/postiz_test')
    ).not.toThrow();
    expect(() =>
      assertTestDatabase('postgresql://u:p@localhost:5432/postiz-db-local-test')
    ).not.toThrow();
  });
});
