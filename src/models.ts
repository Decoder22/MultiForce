export interface SfOrg {
    username: string;
    alias: string;
}

export interface LocalStore {
    orgs: SfOrg[],
    sfPath: string;
}

export interface AuthOrgValues {
    type: string;
    url?: string;
    alias: string;
    label: string;
  }
  