import { getEnvironment } from "./config/env.js";
import { createApp } from "./app.js";

const environment = getEnvironment();
const { app } = createApp(environment);
app.listen(environment.API_PORT, () =>
  console.info(`Velozy API listening on ${environment.API_PORT}`),
);
