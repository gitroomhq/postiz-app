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
  org: Array<{
    id: string;
    name: string;
  }>;
  currentOrg: {
    id: string;
    name: string;
  };
}
