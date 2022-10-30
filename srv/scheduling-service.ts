import { ApplicationService, log } from "@sap/cds";
import { CronJob } from "cron";
import { DateTime } from "luxon";
import { cfApi, ServiceStatus } from "./lib/cf-api";

const LOG = log("scheduler");

class SchedulingService extends ApplicationService {
  override async init() {
    const newJob = new CronJob(
      "0 0 7 * * *",
      this._checkAndStartHana.bind(this),
      null,
      false,
      "Europe/Berlin"
    );
    newJob.start();

    LOG.info(`HANA Scheduler started`);
    LOG.info(
      `Next execution on: ${newJob.nextDate().toISODate()}, ${newJob
        .nextDate()
        .toISOTime()}`
    );

    if (!newJob.nextDate().hasSame(DateTime.now(), "day")) {
      this._checkAndStartHana();
    }

    await super.init();
  }

  /**
   * Starts the bound HANA service, if not already started
   */
  private async _checkAndStartHana() {
    LOG.info("Scheduled check of HANA instance...");
    const hanaState = await cfApi.getHanaStatus();
    if (hanaState === ServiceStatus.Stopped) {
      const isStarting = await cfApi.startHana();
      if (isStarting) {
        LOG.info("HANA is starting");
      } else {
        console.error("Error during HANA start");
      }
    } else if (hanaState === ServiceStatus.Running) {
      LOG.info("HANA is already running...");
    } else {
      LOG.info("HANA is starting or stopping...");
    }
  }
}

export { SchedulingService };
