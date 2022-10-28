import { ApplicationService } from "@sap/cds";
import { CronJob } from "cron";

class SchedulingService extends ApplicationService {
  private _jobs = new Set<CronJob>();

  override async init() {
    this.on("startJob", async req => {
      const newJob = new CronJob(
        "20 * * * * *",
        this._executeJob.bind(this, req.data.json)
      );
      this._jobs.add(newJob);
      newJob.start();
    });

    this.on("stopAllJobs", req => {
      for (const job of this._jobs) {
        job.stop();
      }
      this._jobs.clear();
    });

    await super.init();
  }

  private _executeJob(config: string) {
    console.log("Scheduled Job", config);
  }
}

module.exports = SchedulingService;
