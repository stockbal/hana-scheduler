import axios, { Axios, AxiosError } from "axios";
import { credStore } from "./credstore";
import { envAccess } from "./env";
import { Logger } from "./log";

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

class CloudFoundryApi {
  private _token: string = "";

  /**
   * Retrieves access token for request to cloud foundry REST API
   * @param username username/email of authorized cloud foundry user
   * @param password password of authorized cloud foundry user
   * @returns valid token for API request
   */
  private async _retrieveToken(): Promise<void> {
    if (this._token !== "") {
      return;
    }
    // access credentials for cf access
    const creds = await credStore.readCredentials(
      "utils",
      "cf-api",
      "password"
    );

    const vcapAppEnv = envAccess.vcapAppEnv;

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

  async getHanaStatus(instanceGuid: string): Promise<ServiceInfo> {
    await this._retrieveToken();

    const hanaInfo = {} as ServiceInfo;

    try {
      const hanaSrvResp = await axios.get(
        `${envAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${instanceGuid}`,
        {
          headers: {
            Authorization: `Bearer ${this._token}`
          }
        }
      );
      hanaInfo.name = hanaSrvResp.data.name;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        throw `No HANA service instance with GUID ${instanceGuid} found`;
      }
    }
    try {
      const hanaSrvParamsResp = await axios.get(
        `${envAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${instanceGuid}/parameters`,
        {
          headers: {
            Authorization: `Bearer ${this._token}`
          }
        }
      );

      hanaInfo.status = !hanaSrvParamsResp.data.data.serviceStopped
        ? ServiceStatus.Running
        : ServiceStatus.Stopped;
      return hanaInfo;
    } catch (error) {
      const errorStatus = (error as AxiosError).response?.status;
      if (errorStatus === 401) {
        this._token = "";
        return this.getHanaStatus(instanceGuid);
      }
      if (errorStatus !== 409) {
        console.error((error as AxiosError).response?.data);
      }
      hanaInfo.status = ServiceStatus.Indeterminate;
      return hanaInfo;
    }
  }

  async startHana(instanceGuid: string): Promise<boolean> {
    await this._retrieveToken();
    try {
      const hanaSrvParamsResp = await axios.patch(
        `${envAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${instanceGuid}`,
        {
          parameters: {
            data: {
              serviceStopped: false
            }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this._token}`
          }
        }
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
}

export const cfApi = new CloudFoundryApi();
