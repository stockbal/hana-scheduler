import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { CredStore } from "../credstore";
import { getEncryptedPassword } from "./encryption";
import { EnvAccess } from "../env";
import { loadTestEnv } from "./env-loader";

const oldEnv = process.env;

const mockedAxios = new MockAdapter(axios, { onNoMatch: "throwException" });

describe("Credentials", () => {
  beforeAll(async () => {
    loadTestEnv();

    mockedAxios
      .onGet(
        `${EnvAccess.credstoreEnv.credentials.url}/password`,
        { params: { name: "test-creds" } },
        expect.objectContaining({ "sapcp-credstore-namespace": "test" })
      )
      .reply(200, await getEncryptedPassword());
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it("read password", async () => {
    const credStore = new CredStore();
    const creds = await credStore.readCredentials(
      "test",
      "test-creds",
      "password"
    );

    expect(creds).toStrictEqual({
      password: "secret1",
      username: "userA@company.com"
    });
  });
});
