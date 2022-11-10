import express from "express";
import fs from "fs";

import { Logger } from "./lib/log";
import { HanaScheduler } from "./lib/scheduler";

startExpressForHealthCheck();

// Prio 1: check env for job config
let jobScheduleJson: string | undefined =
  process.env.HANA_SCHEDULER_JOB_CONFIG || undefined;
if (!jobScheduleJson) {
  try {
    // Prio 2: check for local json file
    jobScheduleJson = fs.readFileSync(__dirname + "/jobconfig.json", {
      encoding: "utf-8"
    });
    Logger.info("Using config from file 'jobconfig.json'");
  } catch (error) {
    jobScheduleJson = undefined;
    Logger.error(error);
  }
} else {
  Logger.info("Using job config from Environment");
}

if (jobScheduleJson) {
  const scheduler = new HanaScheduler(jobScheduleJson);
  scheduler.run();
}

/**
 * Although this application does not really need a web service
 * we still have to create a standard endpoint at "/" so cloud foundry
 * can perform a health check to signal the container is healthy.
 *
 * If this is not included the app container can not start correctly
 */
function startExpressForHealthCheck() {
  const app = express();

  app.get("/", (_req, res) => {
    res.sendStatus(200);
  });

  app.listen(process.env.port || 8080);
}
