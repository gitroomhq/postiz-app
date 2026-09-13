/** Apple's button only mounts when APPLE_CLIENT_ID is set. Zero or one. */
export const shouldShowAppleSignIn = (appleClientId?: string | null) =>
  !!appleClientId;
