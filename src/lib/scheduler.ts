import { z } from "zod";
import { CronJob, CronTime } from "cron";
import { DateTime } from "luxon";
import { Logger } from "./log";
import { CloudFoundryApi, ServiceStatus } from "./cf-api";

const JobSchema = z.object({
  hanaInstanceGuid: z.string(),
  startCronTimePattern: z.string()
});

const JobsSchema = JobSchema.array().nonempty();
type Job = z.TypeOf<typeof JobSchema>;

export class HanaScheduler {
  private _jobsConfig: Job[] | undefined;
  private _cfApi: CloudFoundryApi | undefined;

  constructor(jobConfigJson: string) {
    try {
      this._jobsConfig = JobsSchema.parse(JSON.parse(jobConfigJson));
      this.checkForDuplicateConfigs();
      this.validateCronTimes();
    } catch (validationError) {
      this._jobsConfig = undefined;
      if (validationError instanceof z.ZodError) {
        Logger.error(
          "Error in Job configuration schema",
          (validationError as z.ZodError).issues
        );
      } else if (validationError instanceof Error) {
        Logger.error(`Error: ${(validationError as Error).message}`);
      } else {
        Logger.error(validationError);
      }
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
      this.createJob(jobConfig);
    }
  }

  private get cfApi() {
    if (!this._cfApi) {
      this._cfApi = new CloudFoundryApi();
    }
    return this._cfApi;
  }

  private createJob(jobConfig: Job) {
    const newJob = new CronJob(
      jobConfig.startCronTimePattern,
      this.checkAndStartHana.bind(this, jobConfig.hanaInstanceGuid, true),
      null,
      false,
      "Europe/Berlin"
    );
    newJob.start();

    if (!newJob.nextDate().hasSame(DateTime.now(), "day")) {
      this.checkAndStartHana(jobConfig.hanaInstanceGuid, false);
    }

    Logger.info(
      `Next scheduled start for HANA instance ${
        jobConfig.hanaInstanceGuid
      } at ${newJob.nextDate().toFormat("yyyy LLL dd, HH:mm:ssZ")}`
    );
  }

  private checkForDuplicateConfigs() {
    if (!this._jobsConfig) {
      return;
    }

    const uniqueInstanceGuids = new Set();
    for (const jobConfig of this._jobsConfig) {
      uniqueInstanceGuids.add(jobConfig.hanaInstanceGuid);
    }

    if (uniqueInstanceGuids.size < this._jobsConfig.length) {
      throw new Error(
        "There are duplicate HANA instance GUIDs in the config file"
      );
    }
  }

  private validateCronTimes() {
    if (!this._jobsConfig) {
      return;
    }

    this._jobsConfig.forEach((jobConfig, i) => {
      try {
        new CronTime(jobConfig.startCronTimePattern);
      } catch (error) {
        throw new Error(
          `Invalid Job Config at index ${i}: ${(error as Error).message}`
        );
      }
    });
  }

  /**
   * Starts a given HANA service, if not already started
   */
  private async checkAndStartHana(
    hanaInstanceGuid: string,
    scheduled: boolean
  ) {
    try {
      const hanaInfo = await this.cfApi.getHanaStatus(hanaInstanceGuid);

      if (scheduled) {
        Logger.info(`Check if HANA instance '${hanaInfo.name}' is running...`);
      } else {
        Logger.info(
          `Initial check for running HANA instance '${hanaInfo.name}'...`
        );
      }
      if (hanaInfo.status === ServiceStatus.Stopped) {
        const isStarting = await this.cfApi.startHana(hanaInstanceGuid);
        if (isStarting) {
          Logger.info(`HANA instance '${hanaInfo.name}' is starting`);
        } else {
          Logger.error(`Error during start of HANA instance ${hanaInfo.name}`);
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
