export interface UserOrg {
  id: string;
  name: string;
}

export interface UserFromRequest {
  id: string;
  email: string;
  currentEnv: {
    id: string;
    name: string;
    public_key: string;
  };
  env: Array<{
    id: string;
    name: string;
  }>;
  org: Array<UserOrg>;
  currentOrg: UserOrg;
}
