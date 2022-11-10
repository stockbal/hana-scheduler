import { JWK, JWE } from "node-jose";
import { generateKeyPairSync } from "crypto";

export const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

/**
 * Generates and returns encrypted secrefor mocking credential from credent
 * @returns encrypted secret
 */
export async function getEncryptedPassword(): Promise<string> {
  const encryptionKey = await JWK.asKey(
    `-----BEGIN PUBLIC KEY-----${publicKey}-----END PUBLIC KEY-----`,
    "pem",
    {
      alg: "RSA-OAEP-256"
    }
  );

  const encryptOptions = {
    contentAlg: "A256GCM",
    compact: true,
    fields: {
      iat: Math.round(new Date().getTime() / 1000)
    }
  };

  return JWE.createEncrypt(encryptOptions, encryptionKey)
    .update(
      JSON.stringify({
        name: "userA",
        value: "secret1",
        username: "userA@company.com"
      })
    )
    .final();
}
