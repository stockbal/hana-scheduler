import { EnvAccess } from "../env";
import { loadTestEnv } from "./env-loader";

const oldEnv = process.env;

describe("Environment", () => {
  beforeEach(() => {
    process.env.VCAP_SERVICES = "";
    process.env.VCAP_APPLICATION = "";
  });
  afterEach(() => {
    EnvAccess.reset();
  });
  afterAll(() => {
    process.env = oldEnv;
  });

  it("access cloud foundry environment", async () => {
    loadTestEnv();
    expect(EnvAccess.vcapAppEnv.cfApiUrl).toBeDefined();
    expect(EnvAccess.credstoreEnv.credentials.url).toBeDefined();
  });
  it("no cloud foundry environment", async () => {
    expect(() => EnvAccess.vcapAppEnv).toThrow(
      new Error("Cloud foundry environment not available!")
    );
  });
});
