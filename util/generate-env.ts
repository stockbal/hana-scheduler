import fs from "fs/promises";

(async () => {
  try {
    const defaultEnv = JSON.parse(
      (await fs.readFile(__dirname + "/../default-env.json")).toString("utf-8")
    );
    const envContent = `VCAP_APPLICATION=${JSON.stringify(
      defaultEnv.VCAP_APPLICATION
    )}\nVCAP_SERVICES=${JSON.stringify(defaultEnv.VCAP_SERVICES)}`;

    await fs.writeFile(__dirname + "/../src/.env", envContent);
    console.log(".env created from default-env.json");
  } catch (error) {
    console.error(error);
  }
})();
