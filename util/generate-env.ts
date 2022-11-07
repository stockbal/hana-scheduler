import fs from "fs/promises";
import { stringify } from "envfile";
import { parse } from "dotenv";

const envFileName = __dirname + "/../src/.env";

(async () => {
  try {
    const defaultEnv = JSON.parse(
      await fs.readFile(__dirname + "/../default-env.json", {
        encoding: "utf-8"
      })
    );

    // read existing .env file to prevent override of other properties
    const envContent = await readExistingEnv();
    envContent.VCAP_APPLICATION = JSON.stringify(defaultEnv.VCAP_APPLICATION);
    envContent.VCAP_SERVICES = JSON.stringify(defaultEnv.VCAP_SERVICES);

    await fs.writeFile(envFileName, stringify(envContent));
    console.log(".env created from default-env.json");
  } catch (error) {
    console.error(error);
  }
})();

async function readExistingEnv(): Promise<Record<string, string>> {
  try {
    const envFileContent = await fs.readFile(envFileName, {
      encoding: "utf-8"
    });
    return parse(envFileContent);
  } catch (error) {
    return {};
  }
}
