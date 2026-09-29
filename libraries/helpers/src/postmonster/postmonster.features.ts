// postmonster: single place for optional Postiz features (PRD 7.2).
// Early Access ships with every optional feature OFF; to bring one back set
// the matching NEXT_PUBLIC_FEATURE_* env to 'true', or NEXT_PUBLIC_FEATURES=all
// to enable everything at once (useful for upstream parity checks).
// Literal process.env member access is required: Next.js inlines only
// `process.env.NEXT_PUBLIC_X` expressions into client bundles.

export type PostmonsterFeatureName =
  | 'billing'
  | 'ai'
  | 'publicApi'
  | 'plugs'
  | 'sets'
  | 'thirdParty'
  | 'approvedApps'
  | 'impersonate'
  | 'ugc';

export type PostmonsterFeatures = Record<PostmonsterFeatureName, boolean>;

const enabled = (value?: string) =>
  value === 'true' || value === '1' || value === 'yes';

const readFeatures = (): PostmonsterFeatures => {
  if (process.env.NEXT_PUBLIC_FEATURES === 'all') {
    return {
      billing: true,
      ai: true,
      publicApi: true,
      plugs: true,
      sets: true,
      thirdParty: true,
      approvedApps: true,
      impersonate: true,
      ugc: true,
    };
  }

  return {
    billing: enabled(process.env.NEXT_PUBLIC_FEATURE_BILLING),
    ai: enabled(process.env.NEXT_PUBLIC_FEATURE_AI),
    publicApi: enabled(process.env.NEXT_PUBLIC_FEATURE_PUBLIC_API),
    plugs: enabled(process.env.NEXT_PUBLIC_FEATURE_PLUGS),
    sets: enabled(process.env.NEXT_PUBLIC_FEATURE_SETS),
    thirdParty: enabled(process.env.NEXT_PUBLIC_FEATURE_THIRD_PARTY),
    approvedApps: enabled(process.env.NEXT_PUBLIC_FEATURE_APPROVED_APPS),
    impersonate: enabled(process.env.NEXT_PUBLIC_FEATURE_IMPERSONATE),
    ugc: enabled(process.env.NEXT_PUBLIC_FEATURE_UGC),
  };
};

export const postmonsterFeatures = (): PostmonsterFeatures => readFeatures();

export const isFeatureEnabled = (name: PostmonsterFeatureName): boolean =>
  readFeatures()[name];
