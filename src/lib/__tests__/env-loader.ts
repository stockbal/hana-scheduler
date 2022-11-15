import { Env } from "../env";
import { privateKey } from "./encryption";

const env: Env = {
  VCAP_APPLICATION: {
    cf_api: "http://cf.api.com"
  },
  VCAP_SERVICES: {
    credstore: [
      {
        credentials: {
          encryption: {
            client_private_key: privateKey
          },
          username: "userA",
          password: "secret1",
          url: "http://localhost:9000/crs"
        }
      }
    ]
  }
};

export const loadTestEnv = () => {
  process.env.VCAP_APPLICATION = JSON.stringify(env.VCAP_APPLICATION);
  process.env.VCAP_SERVICES = JSON.stringify(env.VCAP_SERVICES);
};
