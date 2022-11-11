import { config } from "dotenv";
import z from "zod";

config();

const EnvSchema = z.object({
  VCAP_SERVICES: z.object({
    credstore: z
      .object({
        credentials: z.object({
          encryption: z.object({
            client_private_key: z.string()
          }),
          url: z.string(),
          password: z.string(),
          username: z.string()
        })
      })
      .array()
      .nonempty()
  }),
  VCAP_APPLICATION: z.object({
    cf_api: z.string()
  })
});

export type Env = z.TypeOf<typeof EnvSchema>;

export type CredStoreEnv = Env["VCAP_SERVICES"]["credstore"][0];

export type CredStoreCredentials = CredStoreEnv["credentials"];

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
export class EnvAccess {
  private static _credstore: CredStoreEnv | undefined;
  private static _vcapApp: VcapAppEnv | undefined;

  static reset() {
    this._credstore = undefined;
    this._vcapApp = undefined;
  }

  static get credstoreEnv(): CredStoreEnv {
    if (!EnvAccess._credstore) {
      EnvAccess.init();
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return EnvAccess._credstore!;
  }

  static get vcapAppEnv(): VcapAppEnv {
    if (!EnvAccess._vcapApp) {
      EnvAccess.init();
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return EnvAccess._vcapApp!;
  }

  private static init() {
    if (!process.env.VCAP_SERVICES || !process.env.VCAP_APPLICATION) {
      throw new Error("Cloud foundry environment not available!");
    }
    const envExtract = {
      VCAP_SERVICES: JSON.parse(process.env.VCAP_SERVICES as string),
      VCAP_APPLICATION: JSON.parse(process.env.VCAP_APPLICATION as string)
    };
    const env = EnvSchema.parse(envExtract);

    EnvAccess._credstore = env.VCAP_SERVICES.credstore[0];

    EnvAccess._vcapApp = {
      cfApiUrl: env.VCAP_APPLICATION.cf_api,
      cfApiTokenUrl: `${env.VCAP_APPLICATION.cf_api.replace(
        "api",
        "login"
      )}/oauth/token`
    };
  }
}
