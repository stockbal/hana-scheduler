import axios from "axios";
import { JWE, JWK } from "node-jose";
import { CredStoreCredentials, envAccess } from "./env";

type Credentials = {
  username: string;
  password: string;
};

/**
 * Singleton for accessing the bound Credstore service instance
 */
class CredStore {
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
    const credstoreSrvCreds = envAccess.credstoreEnv.credentials;

    const credResp = await axios.get(
      `${credstoreSrvCreds.url}/${type}?name=${encodeURIComponent(name)}`,
      {
        headers: this._createHeaders(credstoreSrvCreds, namespace)
      }
    );

    return this._decryptCredential(
      credResp.data,
      credstoreSrvCreds.encryption.client_private_key
    );
  }

  private _createHeaders(credentials: CredStoreCredentials, namespace: string) {
    return {
      Authorization: `Basic ${Buffer.from(
        `${credentials.username}:${credentials.password}`
      ).toString("base64")}`,
      "sapcp-credstore-namespace": namespace
    };
  }

  private async _decryptCredential(
    encryptedCreds: string,
    privateKey: string
  ): Promise<Credentials> {
    const key = await JWK.asKey(
      `-----BEGIN PRIVATE KEY-----${privateKey}-----END PRIVATE KEY-----`,
      "pem",
      { alg: "RSA-OAEP-256", enc: "A256GCM" }
    );
    const decrypt = await JWE.createDecrypt(key).decrypt(encryptedCreds);
    const credsAsJson = decrypt.plaintext.toString();
    const creds = JSON.parse(credsAsJson);

    return {
      username: creds.username,
      password: creds.value
    };
  }
}

export const credStore = new CredStore();
