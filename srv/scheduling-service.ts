import { ApplicationService } from "@sap/cds";
import { CronJob } from "cron";
import { DateTime } from "luxon";
import { cfApi, HanaStatus } from "./lib/cf-api";

class SchedulingService extends ApplicationService {
  override async init() {
    const newJob = new CronJob(
      "* * 7 * * *",
      this._checkAndStartHana.bind(this)
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
    if (hanaState === HanaStatus.Stopped) {
      if (await cfApi.startHana()) {
        console.log("HANA is starting");
      }
    } else if (hanaState === HanaStatus.Running) {
      console.log("HANA is already running...");
    } else {
      console.log("HANA is starting...");
    }
  }
}

export { SchedulingService };
