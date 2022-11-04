import { config } from "dotenv";

config();

export type CredStoreCredentials = {
  encryption: {
    client_private_key: string;
  };
  username: string;
  password: string;
  url: string;
};

export type HanaCloudEnv = {
  instance_guid: string;
};

export type CredStoreEnv = {
  credentials: CredStoreCredentials;
};

export type VcapAppEnv = {
  /**
   * URL to CF API
   */
  cfApiUrl: string;
  cfApiTokenUrl: string;
};

/**
 * Singleton to access relevant data from Environment
 */
class EnvAccess {
  private _credstore: CredStoreEnv;
  private _vcapApp: VcapAppEnv;

  constructor() {
    const vcapServices = JSON.parse(process.env.VCAP_SERVICES as string);

    this._credstore = vcapServices.credstore[0];

    const capApplication = JSON.parse(process.env.VCAP_APPLICATION as string);

    this._vcapApp = {
      cfApiUrl: capApplication.cf_api,
      cfApiTokenUrl: `${capApplication.cf_api.replace(
        "api",
        "login"
      )}/oauth/token`
    };
  }

  get credstoreEnv(): CredStoreEnv {
    return this._credstore;
  }

  get vcapAppEnv(): VcapAppEnv {
    return this._vcapApp;
  }
}

export const envAccess = new EnvAccess();
