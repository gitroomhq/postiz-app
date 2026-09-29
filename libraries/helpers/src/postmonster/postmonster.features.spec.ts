import {
  isFeatureEnabled,
  postmonsterFeatures,
} from '@gitroom/helpers/postmonster/postmonster.features';

// postmonster: feature flags are read from the environment on every call, so
// the defaults (Early Access) and the restore switches can be tested directly
describe('postmonster feature flags (PRD 7.2)', () => {
  const flagNames = [
    'NEXT_PUBLIC_FEATURE_BILLING',
    'NEXT_PUBLIC_FEATURE_AI',
    'NEXT_PUBLIC_FEATURE_PUBLIC_API',
    'NEXT_PUBLIC_FEATURE_PLUGS',
    'NEXT_PUBLIC_FEATURE_SETS',
    'NEXT_PUBLIC_FEATURE_THIRD_PARTY',
    'NEXT_PUBLIC_FEATURE_APPROVED_APPS',
    'NEXT_PUBLIC_FEATURE_IMPERSONATE',
    'NEXT_PUBLIC_FEATURE_UGC',
  ];

  const clearFlags = () => {
    for (const name of flagNames) {
      delete process.env[name];
    }
    delete process.env.NEXT_PUBLIC_FEATURES;
  };

  beforeEach(clearFlags);
  afterAll(clearFlags);

  it('hides every optional feature by default (Early Access)', () => {
    expect(postmonsterFeatures()).toEqual({
      billing: false,
      ai: false,
      publicApi: false,
      plugs: false,
      sets: false,
      thirdParty: false,
      approvedApps: false,
      impersonate: false,
      ugc: false,
    });
    expect(isFeatureEnabled('billing')).toBe(false);
    expect(isFeatureEnabled('plugs')).toBe(false);
  });

  it('turns a feature back on with its own env', () => {
    process.env.NEXT_PUBLIC_FEATURE_PLUGS = 'true';
    process.env.NEXT_PUBLIC_FEATURE_BILLING = '1';
    expect(isFeatureEnabled('plugs')).toBe(true);
    expect(isFeatureEnabled('billing')).toBe(true);
    expect(isFeatureEnabled('ai')).toBe(false);
  });

  it('does not treat arbitrary values as enabled', () => {
    process.env.NEXT_PUBLIC_FEATURE_AI = 'nope';
    expect(isFeatureEnabled('ai')).toBe(false);
  });

  it('NEXT_PUBLIC_FEATURES=all enables everything', () => {
    process.env.NEXT_PUBLIC_FEATURES = 'all';
    const features = postmonsterFeatures();
    expect(Object.values(features).every((value) => value === true)).toBe(true);
  });
});
