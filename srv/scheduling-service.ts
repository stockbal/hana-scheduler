import { ApplicationService } from "@sap/cds";
import { CronJob } from "cron";
import { DateTime } from "luxon";
import { cfApi, ServiceStatus } from "./lib/cf-api";

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

    if (!newJob.nextDate().hasSame(DateTime.now(), "day")) {
      this._checkAndStartHana();
    }

    await super.init();
  }

  /**
   * Starts the bound HANA service, if not already started
   */
  private async _checkAndStartHana() {
    console.log("> Scheduled check of HANA instance...");
    const hanaState = await cfApi.getHanaStatus();
    if (hanaState === ServiceStatus.Stopped) {
      const isStarting = await cfApi.startHana();
      if (isStarting) {
        console.log("HANA is starting");
      } else {
        console.error("Error during HANA start");
      }
    } else if (hanaState === ServiceStatus.Running) {
      console.log("HANA is already running...");
    } else {
      console.log("HANA is starting or stopping...");
    }
  }
}

export { SchedulingService };
