import axios, { AxiosError } from "axios";
import { CredStore } from "./credstore";
import { EnvAccess } from "./env";

const serviceInstancesEndpoint = "/v3/service_instances";

export type ServiceInfo = {
  status: ServiceStatus;
  name: string;
};

export enum ServiceStatus {
  Running,
  Indeterminate,
  Stopped
}

export class CloudFoundryApi {
  private _token = "";
  private _credStore: CredStore;

  constructor() {
    this._credStore = new CredStore();
  }

  async getHanaStatus(instanceGuid: string): Promise<ServiceInfo> {
    await this.retrieveToken();

    const hanaInfo = {} as ServiceInfo;

    try {
      const hanaSrvResp = await axios.get(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${instanceGuid}`,
        this.getAuthConfig()
      );
      hanaInfo.name = hanaSrvResp.data.name;
    } catch (error) {
      const errorStatus = (error as AxiosError).response?.status;
      if (errorStatus === 401) {
        this._token = "";
        return this.getHanaStatus(instanceGuid);
      } else if (errorStatus === 404) {
        throw new Error(
          `No HANA service instance with GUID ${instanceGuid} found`
        );
      }
    }
    try {
      const hanaSrvParamsResp = await axios.get(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${instanceGuid}/parameters`,
        this.getAuthConfig()
      );

      hanaInfo.status = !hanaSrvParamsResp.data.data.serviceStopped
        ? ServiceStatus.Running
        : ServiceStatus.Stopped;
      return hanaInfo;
    } catch (error) {
      if ((error as AxiosError).response?.status !== 409) {
        console.error((error as AxiosError).response?.data);
      }
      hanaInfo.status = ServiceStatus.Indeterminate;
      return hanaInfo;
    }
  }

  async startHana(instanceGuid: string): Promise<boolean> {
    await this.retrieveToken();
    try {
      const hanaSrvParamsResp = await axios.patch(
        `${EnvAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${instanceGuid}`,
        {
          parameters: {
            data: {
              serviceStopped: false
            }
          }
        },
        this.getAuthConfig()
      );
      return hanaSrvParamsResp.status === 202;
    } catch (error) {
      if ((error as AxiosError).response?.status === 401) {
        this._token = "";
        return this.startHana(instanceGuid);
      }
      console.error(
        "Error during starting of HANA instance!",
        (error as AxiosError).response?.data
      );

      return false;
    }
  }

  private getAuthConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this._token}`
      }
    };
  }

  /**
   * Retrieves access token for request to cloud foundry REST API
   * @returns Promise<void>
   */
  private async retrieveToken(): Promise<void> {
    if (this._token !== "") {
      return;
    }
    // access credentials for cf access
    const creds = await this._credStore.readCredentials(
      "utils",
      "cf-api",
      "password"
    );

    const vcapAppEnv = EnvAccess.vcapAppEnv;

    const tokenResp = await axios.post<{ access_token: string }>(
      vcapAppEnv.cfApiTokenUrl,
      new URLSearchParams({
        grant_type: "password",
        username: creds.username,
        password: creds.password
      }),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: "Basic Y2Y6",
          accept: "application/json"
        }
      }
    );
    this._token = tokenResp.data.access_token;
  }
}
