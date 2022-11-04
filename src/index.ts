import express from "express";
import fs from "fs";

import { Logger } from "./lib/log";
import { HanaScheduler } from "./lib/scheduler";

startExpressForHealthCheck();

try {
  const jobScheduleJson = fs.readFileSync(__dirname + "/jobconfig.json", {
    encoding: "utf-8"
  });
  const scheduler = new HanaScheduler(jobScheduleJson);
  scheduler.run();
} catch (error) {
  Logger.error(error);
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

  app.get("/", (req, res) => {
    res.sendStatus(200);
  });

  app.listen(process.env.port || 8080);
}
