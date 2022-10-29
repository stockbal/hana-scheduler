import axios, { AxiosError } from "axios";
import { credStore } from "./credstore";
import { envAccess } from "./env";

const serviceInstancesEndpoint = "/v3/service_instances";

export enum HanaStatus {
  Running,
  Starting,
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

  async getHanaStatus(): Promise<HanaStatus> {
    await this._retrieveToken();
    try {
      const hanaSrvParamsResp = await axios.get(
        `${envAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${envAccess.hanaEnv.instance_guid}/parameters`,
        {
          headers: {
            Authorization: `Bearer ${this._token}`
          }
        }
      );
      return !hanaSrvParamsResp.data.data.serviceStopped
        ? HanaStatus.Running
        : HanaStatus.Stopped;
    } catch (error) {
      console.error((error as AxiosError).response?.status);

      return HanaStatus.Starting;
    }
  }

  async startHana(): Promise<boolean> {
    await this._retrieveToken();
    try {
      const hanaSrvParamsResp = await axios.patch(
        `${envAccess.vcapAppEnv.cfApiUrl}${serviceInstancesEndpoint}/${envAccess.hanaEnv.instance_guid}`,
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
      return hanaSrvParamsResp.status === 200;
    } catch (error) {
      console.error(
        "Error during starting of HANA instance!",
        (error as AxiosError).response?.data
      );

      return false;
    }
  }
}

export const cfApi = new CloudFoundryApi();
