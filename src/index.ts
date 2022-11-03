import { CronJob } from "cron";
import { DateTime } from "luxon";
import express from "express";
import { cfApi, ServiceStatus } from "./lib/cf-api";

const LOG = {
  info: (text: string) => console.info(`[scheduler] - ${text}`),
  warn: (text: string) => console.warn(`[scheduler] - ${text}`)
};

const app = express();

app.get("/", (req, res) => {
  res.send("");
});

app.listen(process.env.port || 8080);

const newJob = new CronJob(
  "0 0 7 * * *",
  checkAndStartHana,
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

(async () => {
  if (!newJob.nextDate().hasSame(DateTime.now(), "day")) {
    checkAndStartHana();
  }
})();

/**
 * Starts the bound HANA service, if not already started
 */
async function checkAndStartHana() {
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
