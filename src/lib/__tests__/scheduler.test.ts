import { CloudFoundryApi, ServiceStatus } from "../cf-api";

import { loadTestEnv } from "./env-loader";
import { HanaScheduler, Job, JobResult } from "../scheduler";

const oldProcessEnv = process.env;

describe("HANA Scheduler", () => {
  beforeAll(() => {
    loadTestEnv();

    jest
      .spyOn(CloudFoundryApi.prototype, "getHanaStatus")
      .mockImplementation(async (guid: string) => {
        if (guid === "guid1") {
          return { name: "hana1", status: ServiceStatus.Running };
        } else if (guid === "guid2") {
          return { name: "hana2", status: ServiceStatus.Stopped };
        } else {
          return { name: "hana3", status: ServiceStatus.Indeterminate };
        }
      });
    jest
      .spyOn(CloudFoundryApi.prototype, "startHana")
      .mockImplementation(async guid => {
        if (guid === "guid1") {
          return true;
        } else {
          return false;
        }
      });
  });

  afterAll(() => {
    process.env = oldProcessEnv;
  });

  it("valid job config", async () => {
    const jobs = [
      { hanaInstanceGuid: "guid1", startCronTimePattern: "0 0 7 * * *" },
      { hanaInstanceGuid: "guid2", startCronTimePattern: "0 0 7 * * *" }
    ] as Job[];
    const scheduler = new HanaScheduler(JSON.stringify(jobs));
    await expect(scheduler.run()).resolves.toStrictEqual([
      { hanaInstanceGuid: "guid1", started: true },
      { hanaInstanceGuid: "guid2", started: true }
    ] as JobResult[]);

    scheduler.teardown();
  });

  it("invalid cron time", async () => {
    const jobs = [
      { hanaInstanceGuid: "guid1", startCronTimePattern: "0 0 7 * * d" }
    ] as Job[];

    expect(() => new HanaScheduler(JSON.stringify(jobs))).toThrowError();
  });

  it("duplicate job configurations", async () => {
    const jobs = [
      { hanaInstanceGuid: "guid1", startCronTimePattern: "0 0 7 * * *" },
      { hanaInstanceGuid: "guid1", startCronTimePattern: "0 0 7 * * *" }
    ] as Job[];

    expect(() => new HanaScheduler(JSON.stringify(jobs))).toThrowError();
  });

  it("Invalid JSON schema", async () => {
    expect(
      () => new HanaScheduler(JSON.stringify([{ hanaGuid: "asdfs" }]))
    ).toThrowError();
  });
});
