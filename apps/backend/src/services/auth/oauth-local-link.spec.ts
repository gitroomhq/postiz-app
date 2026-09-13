import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  existingAccountForEmail,
  findExistingOauthUser,
  oauthWorkspaceName,
  shouldAttachGoogleId,
  shouldBlockLocalRegister,
  shouldCompleteOauthWithoutOrgForm,
  shouldLinkGoogleToLocalEmail,
  shouldLinkOauthToLocalEmail,
  shouldAttachAppleId,
  type OauthUserStore,
} from './oauth-local-link.ts';

const localUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'local-1',
  email: 'gokhan@example.com',
  providerName: 'LOCAL',
  providerId: '',
  appleProviderId: '',
  activated: true,
  password: 'hashed',
  deletedAt: null,
  ...overrides,
});

describe('shouldLinkGoogleToLocalEmail', () => {
  it('links only Google when an email is present', () => {
    assert.equal(shouldLinkGoogleToLocalEmail('GOOGLE', 'a@b.com'), true);
    assert.equal(shouldLinkGoogleToLocalEmail('GOOGLE', ''), false);
    assert.equal(shouldLinkGoogleToLocalEmail('GOOGLE', null), false);
    assert.equal(shouldLinkGoogleToLocalEmail('GITHUB', 'a@b.com'), false);
    assert.equal(shouldLinkGoogleToLocalEmail('LOCAL', 'a@b.com'), false);
  });
});

describe('shouldCompleteOauthWithoutOrgForm', () => {
  it('completes Google and Apple without a company step, not GitHub', () => {
    assert.equal(shouldCompleteOauthWithoutOrgForm('GOOGLE'), true);
    assert.equal(shouldCompleteOauthWithoutOrgForm('APPLE'), true);
    assert.equal(shouldCompleteOauthWithoutOrgForm('GITHUB'), false);
    assert.equal(shouldCompleteOauthWithoutOrgForm('LOCAL'), false);
  });
});

describe('oauthWorkspaceName', () => {
  it('uses the email prefix when it is long enough, otherwise Workspace', () => {
    assert.equal(oauthWorkspaceName('gokhan@example.com'), 'gokhan');
    assert.equal(oauthWorkspaceName('ab@example.com'), 'Workspace');
  });
});

describe('shouldLinkOauthToLocalEmail', () => {
  it('links Google and Apple when an email is present, not GitHub', () => {
    assert.equal(shouldLinkOauthToLocalEmail('GOOGLE', 'a@b.com'), true);
    assert.equal(shouldLinkOauthToLocalEmail('APPLE', 'a@b.com'), true);
    assert.equal(shouldLinkOauthToLocalEmail('APPLE', ''), false);
    assert.equal(shouldLinkOauthToLocalEmail('GITHUB', 'a@b.com'), false);
  });
});

describe('shouldAttachGoogleId', () => {
  it('attaches when empty or already the same id', () => {
    assert.equal(shouldAttachGoogleId('', 'gid'), true);
    assert.equal(shouldAttachGoogleId(null, 'gid'), true);
    assert.equal(shouldAttachGoogleId('gid', 'gid'), true);
    assert.equal(shouldAttachGoogleId('other', 'gid'), false);
  });
});

describe('shouldAttachAppleId', () => {
  it('attaches when empty or already the same id', () => {
    assert.equal(shouldAttachAppleId('', 'aid'), true);
    assert.equal(shouldAttachAppleId(null, 'aid'), true);
    assert.equal(shouldAttachAppleId('aid', 'aid'), true);
    assert.equal(shouldAttachAppleId('other', 'aid'), false);
  });
});

describe('existingAccountForEmail / shouldBlockLocalRegister', () => {
  const googleOnly = {
    id: 'google-user',
    providerName: 'GOOGLE',
    activated: true,
  };

  it('OTP prefers LOCAL when both exist, and never creates a second user', () => {
    const local = localUser();
    assert.equal(existingAccountForEmail(local, googleOnly), local);
  });

  it('OTP when only GOOGLE user exists → that user, no new LOCAL', () => {
    assert.equal(existingAccountForEmail(null, googleOnly), googleOnly);
    assert.equal(existingAccountForEmail(null, null), null);
  });

  it('password register when GOOGLE user exists → Email already exists', () => {
    assert.equal(shouldBlockLocalRegister(googleOnly), true);
    assert.equal(shouldBlockLocalRegister(null), false);
  });
});

describe('findExistingOauthUser', () => {
  const identity = { id: 'google-99', email: 'Gokhan@example.com' };

  it('email then Google: LOCAL wins, providerId set, providerName stays LOCAL', async () => {
    const local = localUser();
    const attached: string[] = [];
    const users: OauthUserStore = {
      getUserByProvider: async () => {
        throw new Error('must not need provider lookup when LOCAL email hits');
      },
      getUserByEmail: async (email) => {
        assert.equal(email, identity.email);
        return local;
      },
      attachProviderId: async (userId, providerId) => {
        attached.push(`${userId}:${providerId}`);
      },
      activateUser: async () => {
        throw new Error('already activated');
      },
    };

    const found = await findExistingOauthUser('GOOGLE', identity, users);
    assert.equal(found, local);
    assert.equal(found?.providerId, 'google-99');
    assert.deepEqual(attached, ['local-1:google-99']);
    assert.equal((found as { providerName: string }).providerName, 'LOCAL');
  });

  it('Google then Google: existing GOOGLE row is returned, no second org', async () => {
    const googleUser = {
      id: 'google-user',
      activated: true,
      providerName: 'GOOGLE',
      providerId: 'google-99',
    };
    const users: OauthUserStore<typeof googleUser> = {
      getUserByProvider: async () => googleUser,
      getUserByEmail: async () => null,
      attachProviderId: async () => {
        throw new Error('must not attach');
      },
      activateUser: async () => {
        throw new Error('must not activate');
      },
    };

    const found = await findExistingOauthUser('GOOGLE', identity, users);
    assert.equal(found, googleUser);
  });

  it('Google then Google after a prior link: LOCAL that already holds the Google id, no second org', async () => {
    const linkedLocal = localUser({ providerId: 'google-99' });
    const users: OauthUserStore = {
      getUserByProvider: async () => linkedLocal,
      getUserByEmail: async () => null,
      attachProviderId: async () => {
        throw new Error('already attached');
      },
      activateUser: async () => {
        throw new Error('must not activate');
      },
    };

    const found = await findExistingOauthUser('GOOGLE', identity, users);
    assert.equal(found, linkedLocal);
    assert.equal((found as { providerName: string }).providerName, 'LOCAL');
  });

  it('GOOGLE duplicate already exists + LOCAL same email: LOCAL wins', async () => {
    const local = localUser();
    const googleDup = {
      id: 'google-dup',
      activated: true,
      providerName: 'GOOGLE',
      providerId: 'google-99',
    };
    const attached: string[] = [];
    const users: OauthUserStore = {
      getUserByProvider: async () => googleDup,
      getUserByEmail: async () => local,
      attachProviderId: async (userId, providerId) => {
        attached.push(`${userId}:${providerId}`);
      },
      activateUser: async () => undefined,
    };

    const found = await findExistingOauthUser('GOOGLE', identity, users);
    assert.equal(found, local);
    assert.notEqual(found, googleDup);
    assert.equal(found?.providerId, 'google-99');
    assert.deepEqual(attached, ['local-1:google-99']);
  });

  it('activates an unactivated LOCAL user when Google proves the inbox', async () => {
    const local = localUser({ activated: false });
    let activated = false;
    const users: OauthUserStore = {
      getUserByProvider: async () => null,
      getUserByEmail: async () => local,
      attachProviderId: async () => undefined,
      activateUser: async (id) => {
        assert.equal(id, 'local-1');
        activated = true;
      },
    };

    const found = await findExistingOauthUser('GOOGLE', identity, users);
    assert.equal(activated, true);
    assert.equal(found?.activated, true);
  });

  it('does not overwrite a different attached Google id, still logs into LOCAL', async () => {
    const local = localUser({ providerId: 'other-google' });
    const users: OauthUserStore = {
      getUserByProvider: async () => {
        throw new Error('must not fall through to leftover GOOGLE');
      },
      getUserByEmail: async () => local,
      attachProviderId: async () => {
        throw new Error('must not overwrite');
      },
      activateUser: async () => undefined,
    };

    const found = await findExistingOauthUser('GOOGLE', identity, users);
    assert.equal(found, local);
    assert.equal(found?.providerId, 'other-google');
  });

  it('does not link GitHub to a LOCAL email', async () => {
    const users: OauthUserStore = {
      getUserByProvider: async () => null,
      getUserByEmail: async () => {
        throw new Error('must not look up LOCAL for GitHub');
      },
      attachProviderId: async () => undefined,
      activateUser: async () => undefined,
    };

    const found = await findExistingOauthUser('GITHUB', identity, users);
    assert.equal(found, null);
  });

  it('no LOCAL and no GOOGLE → null (caller registers)', async () => {
    const users: OauthUserStore = {
      getUserByProvider: async () => null,
      getUserByEmail: async () => null,
      attachProviderId: async () => {
        throw new Error('must not attach');
      },
      activateUser: async () => undefined,
    };

    const found = await findExistingOauthUser('GOOGLE', identity, users);
    assert.equal(found, null);
  });

  it('email then Apple: LOCAL wins, appleProviderId set, Google providerId untouched', async () => {
    const local = localUser({ providerId: 'google-99' });
    const attached: string[] = [];
    const users: OauthUserStore = {
      getUserByProvider: async () => {
        throw new Error('must not need provider lookup when LOCAL email hits');
      },
      getUserByEmail: async (email) => {
        assert.equal(email, identity.email);
        return local;
      },
      attachProviderId: async () => {
        throw new Error('must not write Apple onto providerId');
      },
      attachAppleProviderId: async (userId, appleProviderId) => {
        attached.push(`${userId}:${appleProviderId}`);
      },
      activateUser: async () => {
        throw new Error('already activated');
      },
    };

    const appleIdentity = { id: 'apple-55', email: identity.email };
    const found = await findExistingOauthUser('APPLE', appleIdentity, users);
    assert.equal(found, local);
    assert.equal(found?.providerId, 'google-99');
    assert.equal(found?.appleProviderId, 'apple-55');
    assert.deepEqual(attached, ['local-1:apple-55']);
    assert.equal((found as { providerName: string }).providerName, 'LOCAL');
  });

  it('Apple then Apple after a prior link: LOCAL that already holds the Apple id', async () => {
    const linkedLocal = localUser({
      providerId: 'google-99',
      appleProviderId: 'apple-55',
    });
    const users: OauthUserStore = {
      getUserByProvider: async () => linkedLocal,
      getUserByEmail: async () => null,
      attachProviderId: async () => {
        throw new Error('must not attach Google');
      },
      attachAppleProviderId: async () => {
        throw new Error('already attached');
      },
      activateUser: async () => {
        throw new Error('must not activate');
      },
    };

    const found = await findExistingOauthUser(
      'APPLE',
      { id: 'apple-55', email: null },
      users,
    );
    assert.equal(found, linkedLocal);
    assert.equal(found?.providerId, 'google-99');
    assert.equal(found?.appleProviderId, 'apple-55');
  });
});

type UserRow = {
  id: string;
  email: string;
  providerName: string;
  providerId: string;
  appleProviderId: string;
  activated: boolean;
  deletedAt: null;
};

// Mirrors users.repository + auth.service: unique (email, providerName),
// getUserByEmail is LOCAL-only, Google lookup prefers a linked LOCAL row.
const makeUserTable = (seed: UserRow[] = []) => {
  const rows: UserRow[] = seed.map((row) => ({ ...row }));
  let seq = rows.length;

  const store: OauthUserStore<UserRow> = {
    getUserByEmail: async (email) =>
      rows.find(
        (row) =>
          row.deletedAt === null &&
          row.providerName === 'LOCAL' &&
          row.email.toLowerCase() === email.toLowerCase(),
      ) ?? null,
    getUserByProvider: async (providerId, provider) => {
      if (provider === 'GOOGLE') {
        const linkedLocal = rows.find(
          (row) =>
            row.deletedAt === null &&
            row.providerName === 'LOCAL' &&
            row.providerId === providerId,
        );
        if (linkedLocal) {
          return linkedLocal;
        }
      }
      if (provider === 'APPLE') {
        const linkedLocal = rows.find(
          (row) =>
            row.deletedAt === null &&
            row.providerName === 'LOCAL' &&
            row.appleProviderId === providerId,
        );
        if (linkedLocal) {
          return linkedLocal;
        }
      }
      return (
        rows.find(
          (row) =>
            row.deletedAt === null &&
            row.providerName === provider &&
            row.providerId === providerId,
        ) ?? null
      );
    },
    attachProviderId: async (userId, providerId) => {
      const row = rows.find(
        (item) => item.id === userId && item.providerName === 'LOCAL',
      );
      if (row) {
        row.providerId = providerId;
      }
    },
    attachAppleProviderId: async (userId, appleProviderId) => {
      const row = rows.find(
        (item) => item.id === userId && item.providerName === 'LOCAL',
      );
      if (row) {
        row.appleProviderId = appleProviderId;
      }
    },
    activateUser: async (id) => {
      const row = rows.find((item) => item.id === id);
      if (row) {
        row.activated = true;
      }
    },
  };

  const insert = (
    providerName: string,
    email: string,
    providerId: string,
  ): UserRow => {
    if (
      rows.some(
        (row) =>
          row.deletedAt === null &&
          row.providerName === providerName &&
          row.email.toLowerCase() === email.toLowerCase(),
      )
    ) {
      throw new Error(`unique (email, providerName): ${email}/${providerName}`);
    }
    seq += 1;
    const row: UserRow = {
      id: `user-${seq}`,
      email,
      providerName,
      providerId,
      appleProviderId: '',
      activated: true,
      deletedAt: null,
    };
    rows.push(row);
    return row;
  };

  const anyProvider = (email: string) => {
    const matches = rows.filter(
      (row) =>
        row.deletedAt === null &&
        row.email.toLowerCase() === email.toLowerCase(),
    );
    return (
      matches.find((row) => row.providerName === 'LOCAL') || matches[0] || null
    );
  };

  const googleSignIn = async (identity: { id: string; email: string }) => {
    const existing = await findExistingOauthUser('GOOGLE', identity, store);
    if (existing) {
      return { user: existing, created: false };
    }
    return {
      user: insert('GOOGLE', identity.email, identity.id),
      created: true,
    };
  };

  const otpSignIn = async (email: string) => {
    const local = await store.getUserByEmail(email);
    const user = existingAccountForEmail(local, local ?? anyProvider(email));
    if (user) {
      return { user, created: false };
    }
    return { user: insert('LOCAL', email, ''), created: true };
  };

  const passwordRegister = async (email: string) => {
    const local = await store.getUserByEmail(email);
    const any = existingAccountForEmail(local, local ?? anyProvider(email));
    if (shouldBlockLocalRegister(any)) {
      throw new Error('Email already exists');
    }
    return insert('LOCAL', email, '');
  };

  const appleSignIn = async (identity: {
    id: string;
    email?: string | null;
  }) => {
    const existing = await findExistingOauthUser('APPLE', identity, store);
    if (existing) {
      return { user: existing, created: false };
    }
    return {
      user: insert(
        'APPLE',
        identity.email || `apple-${identity.id}@privaterelay.appleid.com`,
        identity.id,
      ),
      created: true,
    };
  };

  return {
    rows,
    store,
    googleSignIn,
    appleSignIn,
    otpSignIn,
    passwordRegister,
    insert,
  };
};

describe('one verified inbox is one User (table + unique constraint)', () => {
  const google = { id: 'google-99', email: 'Gokhan@example.com' };

  it('email then Google: same LOCAL row, Google id attached, no second org', async () => {
    const db = makeUserTable();
    const local = db.insert('LOCAL', 'gokhan@example.com', '');

    const first = await db.googleSignIn(google);
    const second = await db.googleSignIn(google);

    assert.equal(first.created, false);
    assert.equal(second.created, false);
    assert.equal(first.user.id, local.id);
    assert.equal(second.user.id, local.id);
    assert.equal(first.user.providerName, 'LOCAL');
    assert.equal(first.user.providerId, 'google-99');
    assert.equal(db.rows.filter((row) => row.deletedAt === null).length, 1);
  });

  it('Google then Google: same GOOGLE row, no second org', async () => {
    const db = makeUserTable();

    const first = await db.googleSignIn(google);
    const second = await db.googleSignIn(google);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(second.user.id, first.user.id);
    assert.equal(second.user.providerName, 'GOOGLE');
    assert.equal(db.rows.length, 1);
  });

  it('leftover GOOGLE duplicate + LOCAL same email: Google login returns LOCAL', async () => {
    const db = makeUserTable();
    const local = db.insert('LOCAL', 'gokhan@example.com', '');
    db.insert('GOOGLE', 'gokhan@example.com', 'google-99');

    const signedIn = await db.googleSignIn(google);

    assert.equal(signedIn.created, false);
    assert.equal(signedIn.user.id, local.id);
    assert.notEqual(signedIn.user.providerName, 'GOOGLE');
    assert.equal(signedIn.user.providerName, 'LOCAL');
    assert.equal(signedIn.user.providerId, 'google-99');
  });

  it('Google then OTP: signs into the GOOGLE user, does not create LOCAL', async () => {
    const db = makeUserTable();
    const googleUser = (await db.googleSignIn(google)).user;

    const otp = await db.otpSignIn('gokhan@example.com');

    assert.equal(otp.created, false);
    assert.equal(otp.user.id, googleUser.id);
    assert.equal(otp.user.providerName, 'GOOGLE');
    assert.equal(db.rows.length, 1);
  });

  it('email then OTP then Google: still the same LOCAL user', async () => {
    const db = makeUserTable();
    const otp = await db.otpSignIn('gokhan@example.com');
    const googleLogin = await db.googleSignIn(google);

    assert.equal(otp.created, true);
    assert.equal(googleLogin.created, false);
    assert.equal(googleLogin.user.id, otp.user.id);
    assert.equal(googleLogin.user.providerName, 'LOCAL');
    assert.equal(googleLogin.user.providerId, 'google-99');
    assert.equal(db.rows.length, 1);
  });

  it('password register after Google: Email already exists', async () => {
    const db = makeUserTable();
    await db.googleSignIn(google);

    await assert.rejects(
      () => db.passwordRegister('gokhan@example.com'),
      /Email already exists/,
    );
    assert.equal(db.rows.length, 1);
  });

  it('GitHub with the same email still registers a separate user', async () => {
    const db = makeUserTable();
    db.insert('LOCAL', 'gokhan@example.com', '');

    const github = await findExistingOauthUser('GITHUB', google, db.store);

    assert.equal(github, null);
  });

  it('email then Apple: same LOCAL row, appleProviderId attached, Google id kept', async () => {
    const db = makeUserTable();
    const local = db.insert('LOCAL', 'gokhan@example.com', 'google-99');

    const first = await db.appleSignIn({ id: 'apple-55', email: google.email });
    const second = await db.appleSignIn({ id: 'apple-55', email: null });

    assert.equal(first.created, false);
    assert.equal(second.created, false);
    assert.equal(first.user.id, local.id);
    assert.equal(second.user.id, local.id);
    assert.equal(first.user.providerName, 'LOCAL');
    assert.equal(first.user.providerId, 'google-99');
    assert.equal(first.user.appleProviderId, 'apple-55');
    assert.equal(second.user.appleProviderId, 'apple-55');
    assert.equal(db.rows.filter((row) => row.deletedAt === null).length, 1);
  });
});
