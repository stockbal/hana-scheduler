import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { CloudFoundryApi, ServiceInfo, ServiceStatus } from "../cf-api";

import { CredStore } from "../credstore";
import { EnvAccess } from "../env";
import { loadTestEnv } from "./env-loader";

const oldEnv = process.env;

const mockedAxios = new MockAdapter(axios, { onNoMatch: "throwException" });

const SERVICES_ENDPOINT = "/v3/service_instances";

describe("Credentials", () => {
  beforeAll(async () => {
    loadTestEnv();

    jest
      .spyOn(CredStore.prototype, "readCredentials")
      .mockImplementation(
        async (namespace: string, name: string, type: "password") => {
          if (
            namespace === "utils" &&
            name === "cf-api" &&
            type === "password"
          ) {
            return {
              username: "userA",
              password: "secret1"
            };
          } else {
            throw new Error("Credentials not found");
          }
        }
      );

    mockedAxios
      .onPost(EnvAccess.vcapAppEnv.cfApiTokenUrl)
      .reply(200, { access_token: "afe194aecf943" });
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  afterEach(() => {
    mockedAxios.resetHistory();
  });

  it("determine HANA status --> without errors", async () => {
    const mockHanaStatusRead = (
      hanaInstance: string,
      hanaName: string,
      stopped: boolean
    ) => {
      mockedAxios
        .onGet(
          `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${hanaInstance}`
        )
        .reply(200, {
          name: hanaName
        } as ServiceInfo)
        .onGet(
          `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${hanaInstance}/parameters`
        )
        .reply(200, {
          data: {
            serviceStopped: stopped
          }
        });
    };

    const cfApi = new CloudFoundryApi();
    [
      {
        instanceGuid: "a6d486af-927e-43a9-8f4c-5bfee08c5c5f",
        hanaName: "hana",
        status: ServiceStatus.Running,
        stopped: false
      },
      {
        instanceGuid: "ac262110-5155-4fb5-a83f-32e67bdf256d",
        hanaName: "hana2",
        status: ServiceStatus.Stopped,
        stopped: true
      }
    ].map(async ({ instanceGuid, hanaName, status, stopped }) => {
      mockHanaStatusRead(instanceGuid, hanaName, stopped);
      const hanaInfo = await cfApi.getHanaStatus(instanceGuid);

      expect(hanaInfo.name).toBe(hanaName);
      expect(hanaInfo.status).toBe(status);
    });
  });

  it("determine HANA status --> instance is indeterminate", async () => {
    const instanceGuid = "2413faf1-5cc7-4fe6-a965-3e027c39b419";
    mockedAxios
      .onGet(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .reply(200, {
        name: "hana"
      } as ServiceInfo)
      .onGet(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}/parameters`
      )
      .reply(409);

    const cfApi = new CloudFoundryApi();

    await expect(cfApi.getHanaStatus(instanceGuid)).resolves.toStrictEqual({
      status: ServiceStatus.Indeterminate,
      name: "hana"
    });
  });

  it("determine HANA status --> invalid token + non existing instance", async () => {
    const instanceGuid = "89bbaf03-b354-4dea-a97e-60ac1d185817";
    mockedAxios
      .onGet(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .replyOnce(401)
      .onGet(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .reply(404);

    const cfApi = new CloudFoundryApi();

    await expect(cfApi.getHanaStatus(instanceGuid)).rejects.toThrow(
      new Error(`No HANA service instance with GUID ${instanceGuid} found`)
    );
  });

  it("determine status of HANA --> unexpected error", async () => {
    const instanceGuid = "01be9a0f-53a7-4f6d-93fd-d12ca8ecd591";

    mockedAxios
      .onPatch(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .replyOnce(401)
      .onPatch(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .replyOnce(202);

    const cfApi = new CloudFoundryApi();
    await expect(cfApi.startHana(instanceGuid)).resolves.toBe(true);
  });

  it("determine status of HANA --> not found for GUID", async () => {
    const instanceGuid = "a103111a-fe19-4b3f-98b2-ebc232cd84a1";
    mockedAxios
      .onGet(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .reply(200, {
        name: "hana"
      } as ServiceInfo)
      .onGet(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}/parameters`
      )
      .reply(400);

    const cfApi = new CloudFoundryApi();

    await expect(cfApi.getHanaStatus(instanceGuid)).resolves.toStrictEqual({
      status: ServiceStatus.Indeterminate,
      name: "hana"
    });
  });

  it("Starting stopped HANA instance", async () => {
    const instanceGuid = "96395844-613e-431a-a708-315cbe19ddde";
    const instanceGuid2 = "a2898354-b5d4-4851-ab7a-b91702cbbf8c";

    [instanceGuid, instanceGuid2].forEach(guid =>
      mockedAxios
        .onPatch(`${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${guid}`)
        .reply(202)
    );

    const cfApi = new CloudFoundryApi();
    await expect(cfApi.startHana(instanceGuid)).resolves.toBe(true);
    await expect(cfApi.startHana(instanceGuid2)).resolves.toBe(true);
  });

  it("Starting stopped HANA instance with invalidated token", async () => {
    const instanceGuid = "210a0ee7-80b4-4d40-92f5-a40583f69c95";

    mockedAxios
      .onPatch(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .replyOnce(401)
      .onPatch(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .replyOnce(202);

    const cfApi = new CloudFoundryApi();
    await expect(cfApi.startHana(instanceGuid)).resolves.toBe(true);
  });

  it("Error during starting stopped HANA instance", async () => {
    const instanceGuid = "9eea2d9f-6b45-417a-b385-4a9d02ab8ae9";

    mockedAxios
      .onPatch(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${SERVICES_ENDPOINT}/${instanceGuid}`
      )
      .reply(400);

    const cfApi = new CloudFoundryApi();
    await expect(cfApi.startHana(instanceGuid)).resolves.toBe(false);
  });
});
