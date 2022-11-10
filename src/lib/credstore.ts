import axios, { AxiosInstance } from "axios";
import { JWE, JWK } from "node-jose";
import { CredStoreCredentials, EnvAccess } from "./env";

type Credentials = {
  username: string;
  password: string;
};

/**
 * Singleton for accessing the bound Credstore service instance
 */
export class CredStore {
  /**
   * Reads the CredStore credentials for the given namespace and name
   * @param namespace namespace for credentials in Credstore service
   * @param name name of the password/key
   * @param type the type of the stored key (e.g. password)
   * @returns the found credentials
   */
  async readCredentials(
    namespace: string,
    name: string,
    type: "password"
  ): Promise<Credentials> {
    const credstoreSrvCreds = EnvAccess.credstoreEnv.credentials;

    const credResp = await this.createAxios(credstoreSrvCreds).get(`/${type}`, {
      params: { name },
      headers: { "sapcp-credstore-namespace": namespace }
    });

    return this.decryptCredential(
      credResp.data,
      credstoreSrvCreds.encryption.client_private_key
    );
  }

  private createAxios(credentials: CredStoreCredentials): AxiosInstance {
    return axios.create({
      baseURL: credentials.url,
      auth: {
        username: credentials.username,
        password: credentials.password
      }
    });
  }

  private async decryptCredential(
    encryptedCreds: string,
    privateKey: string
  ): Promise<Credentials> {
    const key = await JWK.asKey(
      `-----BEGIN PRIVATE KEY-----${privateKey}-----END PRIVATE KEY-----`,
      "pem",
      { alg: "RSA-OAEP-256", enc: "A256GCM" }
    );
    const decryptedCreds = await JWE.createDecrypt(key).decrypt(encryptedCreds);
    const credsAsJson = decryptedCreds.plaintext.toString();
    const creds = JSON.parse(credsAsJson);

    return {
      username: creds.username,
      password: creds.value
    };
  }
}
