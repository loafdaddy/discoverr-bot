import {
  Client,
  GatewayIntentBits
} from "discord.js";
import cron from "node-cron";
import { loadConfig } from "./config";
import { registerInteractions } from "./discord/interactions";
import { SuggestionHistory } from "./discovery/history";
import { postAll } from "./discovery/postAll";
import { describeDailyCron } from "./lib/schedule";
import { SeerrClient } from "./seerr/client";
import { TmdbClient } from "./tmdb/client";

async function main(): Promise<void> {
  const config = loadConfig();
  const tmdb = new TmdbClient(config);
  const seerr = new SeerrClient(config);
  const history = new SuggestionHistory(SuggestionHistory.defaultPath(), config.historyTtlDays);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  registerInteractions(client, seerr);

  client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    if (!cron.validate(config.cronSchedule)) {
      throw new Error(`Invalid CRON_SCHEDULE: ${config.cronSchedule}`);
    }

    cron.schedule(
      config.cronSchedule,
      async () => {
        try {
          await postAll(client, config, tmdb, seerr, history);
        } catch (err) {
          console.error(err);
        }
      },
      { timezone: config.timezone }
    );

    const dailyAt = describeDailyCron(config.cronSchedule);
    const when = dailyAt
      ? `every day at ${dailyAt} ${config.timezone}`
      : `${config.cronSchedule} (${config.timezone})`;
    console.log(`Scheduled discovery: ${when} [cron: ${config.cronSchedule}]`);

    if (config.postOnStart) {
      try {
        await postAll(client, config, tmdb, seerr, history);
      } catch (err) {
        console.error(err);
      }
    }
  });

  await client.login(config.discordToken);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
