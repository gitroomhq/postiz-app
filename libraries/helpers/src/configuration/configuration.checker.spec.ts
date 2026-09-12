import { ConfigurationChecker } from './configuration.checker';

const complete = {
  REDIS_URL: 'redis://localhost:6379',
  DATABASE_URL: 'postgresql://postiz:postiz@localhost:5432/postiz',
  JWT_SECRET: 'a-secret',
  MAIN_URL: 'https://app.example.com',
  FRONTEND_URL: 'https://app.example.com',
  NEXT_PUBLIC_BACKEND_URL: 'https://api.example.com',
  BACKEND_INTERNAL_URL: 'http://localhost:3000',
  STORAGE_PROVIDER: 'local',
};

const checkerFor = (cfg: Record<string, string | undefined>) => {
  const checker = new ConfigurationChecker();
  checker.cfg = cfg as never;
  return checker;
};

describe('ConfigurationChecker.check', () => {
  it('reports nothing for a complete configuration', () => {
    const checker = checkerFor(complete);

    checker.check();

    expect(checker.getIssues()).toEqual([]);
    expect(checker.hasIssues()).toBe(false);
    expect(checker.getIssuesCount()).toBe(0);
  });

  it('names every setting that is missing', () => {
    const checker = checkerFor({ REDIS_URL: 'redis://localhost:6379' });

    checker.check();

    const issues = checker.getIssues().join('\n');
    for (const key of [
      'DATABASE_URL',
      'JWT_SECRET',
      'MAIN_URL',
      'FRONTEND_URL',
      'NEXT_PUBLIC_BACKEND_URL',
      'BACKEND_INTERNAL_URL',
      'STORAGE_PROVIDER',
    ]) {
      expect(issues).toContain(key);
    }
    expect(checker.hasIssues()).toBe(true);
  });

  it('explains why the storage provider is needed', () => {
    const checker = checkerFor({ ...complete, STORAGE_PROVIDER: undefined });

    checker.check();

    expect(checker.getIssues()).toContain(
      'STORAGE_PROVIDER not set. Needed to setup storage.'
    );
  });
});

describe('ConfigurationChecker.checkRedis', () => {
  it('accepts a redis url', () => {
    const checker = checkerFor({ REDIS_URL: 'redis://localhost:6379' });

    checker.checkRedis();

    expect(checker.getIssues()).toEqual([]);
  });

  it('rejects a url on the wrong protocol', () => {
    const checker = checkerFor({ REDIS_URL: 'http://localhost:6379' });

    checker.checkRedis();

    expect(checker.getIssues()).toContain('REDIS_URL must start with redis://');
  });

  it('rejects a value that cannot be parsed as a url', () => {
    const checker = checkerFor({ REDIS_URL: 'redis://a b c' });

    checker.checkRedis();

    expect(checker.getIssues()).toContain('REDIS_URL is not a valid URL');
  });

  // "localhost:6379" parses, with "localhost:" as the protocol, so a
  // host:port pair is reported as the wrong scheme rather than as invalid
  it('treats a bare host and port as the wrong scheme', () => {
    const checker = checkerFor({ REDIS_URL: 'localhost:6379' });

    checker.checkRedis();

    expect(checker.getIssues()).toEqual(['REDIS_URL must start with redis://']);
  });

  it('reports both that it is unset and unparseable when missing', () => {
    const checker = checkerFor({});

    checker.checkRedis();

    expect(checker.getIssues()).toEqual([
      'REDIS_URL not set',
      'REDIS_URL is not a valid URL',
    ]);
  });
});

describe('ConfigurationChecker.checkIsValidUrl', () => {
  it('accepts an ordinary url', () => {
    const checker = checkerFor({ MAIN_URL: 'https://app.example.com' });

    checker.checkIsValidUrl('MAIN_URL');

    expect(checker.getIssues()).toEqual([]);
  });

  it('refuses a trailing slash, which would double up in built links', () => {
    const checker = checkerFor({ MAIN_URL: 'https://app.example.com/' });

    checker.checkIsValidUrl('MAIN_URL');

    expect(checker.getIssues()).toContain('MAIN_URL should not end with /');
  });

  it('reports an unparseable value', () => {
    const checker = checkerFor({ MAIN_URL: 'not a url' });

    checker.checkIsValidUrl('MAIN_URL');

    expect(checker.getIssues()).toContain('MAIN_URL is not a valid URL');
  });

  it('stops at the empty check rather than reporting twice', () => {
    const checker = checkerFor({});

    checker.checkIsValidUrl('MAIN_URL');

    expect(checker.getIssues()).toEqual(['MAIN_URL not set. ']);
  });
});

describe('ConfigurationChecker.checkNonEmpty', () => {
  it('accepts a value that is present', () => {
    const checker = checkerFor({ JWT_SECRET: 'a-secret' });

    expect(checker.checkNonEmpty('JWT_SECRET')).toBe(true);
    expect(checker.getIssues()).toEqual([]);
  });

  it('reports a missing value and appends the description', () => {
    const checker = checkerFor({});

    expect(checker.checkNonEmpty('JWT_SECRET', 'Needed to sign tokens.')).toBe(
      false
    );
    expect(checker.getIssues()).toEqual([
      'JWT_SECRET not set. Needed to sign tokens.',
    ]);
  });

  it('treats an empty string as missing', () => {
    const checker = checkerFor({ JWT_SECRET: '' });

    expect(checker.checkNonEmpty('JWT_SECRET')).toBe(false);
  });
});

describe('ConfigurationChecker environment sources', () => {
  it('reads the values from the process environment', () => {
    vi.stubEnv('JWT_SECRET', 'from-process');
    const checker = new ConfigurationChecker();

    checker.readEnvFromProcess();

    expect(checker.get('JWT_SECRET')).toBe('from-process');
  });

  it('reports a missing key from the process environment as unset', () => {
    vi.stubEnv('STORAGE_PROVIDER', '');
    const checker = new ConfigurationChecker();

    checker.readEnvFromProcess();

    expect(checker.checkNonEmpty('STORAGE_PROVIDER')).toBe(false);
  });
});

// readEnvFromFile resolves a path relative to its own __dirname, inside the
// repository, so exercising it would mean writing and deleting a real .env.
// Left uncovered deliberately rather than reaching into the working tree.
