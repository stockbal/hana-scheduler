import { z } from "zod";
import { CronJob } from "cron";
import { DateTime } from "luxon";
import { Logger } from "./log";
import { cfApi, ServiceStatus } from "./cf-api";

const JobSchema = z.object({
  hanaInstanceGuid: z.string(),
  startCronTimePattern: z.string()
});

const JobsSchema = JobSchema.array().nonempty();
type Job = z.TypeOf<typeof JobSchema>;

export class HanaScheduler {
  private _jobsConfig: Job[] | undefined;
  constructor(jobConfigJson: string) {
    try {
      this._jobsConfig = JobsSchema.parse(JSON.parse(jobConfigJson));

      // check for duplicate entries
      this._checkForDuplicateConfigs();
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        Logger.error(
          "Error in Job configuration",
          (parseError as z.ZodError).issues
        );
      }
    }
  }
  private _checkForDuplicateConfigs() {
    if (!this._jobsConfig) {
      return;
    }

    const uniqueInstanceGuids = new Set();
    for (const jobConfig of this._jobsConfig) {
      uniqueInstanceGuids.add(jobConfig.hanaInstanceGuid);
    }

    if (uniqueInstanceGuids.size < this._jobsConfig.length) {
      this._jobsConfig = undefined;
      Logger.error(
        "There are duplicate HANA instance GUIDs in the config file"
      );
    }
  }
  async run() {
    if (!this._jobsConfig) {
      return;
    }

    Logger.info(
      `Schedule ${this._jobsConfig.length} job(s) for starting HANA instances...`
    );

    for (const jobConfig of this._jobsConfig) {
      this._createJob(jobConfig);
    }
  }
  private _createJob(jobConfig: Job) {
    const newJob = new CronJob(
      jobConfig.startCronTimePattern,
      this._checkAndStartHana.bind(this, jobConfig.hanaInstanceGuid, true),
      null,
      false,
      "Europe/Berlin"
    );
    newJob.start();

    if (!newJob.nextDate().hasSame(DateTime.now(), "day")) {
      this._checkAndStartHana(jobConfig.hanaInstanceGuid, false);
    }

    Logger.info(
      `Next scheduled start for HANA instance ${
        jobConfig.hanaInstanceGuid
      } at ${newJob.nextDate().toFormat("yyyy LLL dd, HH:mm:ssZ")}`
    );
  }
  /**
   * Starts a given HANA service, if not already started
   */
  private async _checkAndStartHana(
    hanaInstanceGuid: string,
    scheduled: boolean
  ) {
    try {
      const hanaInfo = await cfApi.getHanaStatus(hanaInstanceGuid);

      if (scheduled) {
        Logger.info(`Scheduled check of HANA instance '${hanaInfo.name}'...`);
      } else {
        Logger.info(`Initial check of HANA instance '${hanaInfo.name}'...`);
      }
      if (hanaInfo.status === ServiceStatus.Stopped) {
        const isStarting = await cfApi.startHana(hanaInstanceGuid);
        if (isStarting) {
          Logger.info(`HANA instance '${hanaInfo.name}' is starting`);
        } else {
          console.error(`Error during start of HANA instance ${hanaInfo.name}`);
        }
      } else if (hanaInfo.status === ServiceStatus.Running) {
        Logger.info(`HANA instance '${hanaInfo.name}' is already running`);
      } else {
        Logger.info(`HANA instance '${hanaInfo.name}' is starting or stopping`);
      }
    } catch (error) {
      Logger.error(error);
    }
  }
}
