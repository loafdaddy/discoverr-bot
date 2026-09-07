import type { Client } from "discord.js";
import { localDateIso } from "../lib/localDate";
import type { SuggestionHistory } from "../discovery/history";
import type { SeerrClient } from "../seerr/client";
import type { MediaType } from "../types";
import { userFacingRequestError } from "./requestErrors";

export function registerInteractions(
  client: Client,
  seerr: SeerrClient,
  history: SuggestionHistory,
  timeZone: string
): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("request:")) return;

    const [, mediaType, tmdbId] = interaction.customId.split(":");
    if (!mediaType || !tmdbId) return;
    if (mediaType !== "movie" && mediaType !== "tv") return;
    const id = Number(tmdbId);
    if (!Number.isFinite(id) || id <= 0) return;

    try {
      await interaction.deferReply({ ephemeral: true });
      await seerr.request(mediaType as MediaType, id);

      const today = localDateIso(timeZone);
      await history.ensureLoaded();
      history.markRequested(mediaType as MediaType, id, today);
      await history.save();

      await interaction.editReply(
        "Request submitted successfully. It is now waiting for approval in Seerr."
      );
    } catch (err) {
      console.error("Request button failed:", err);

      try {
        const message = userFacingRequestError(err);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(message);
        } else {
          await interaction.reply({ content: message, ephemeral: true });
        }
      } catch (e) {
        console.error("Failed to send button error response:", e);
      }
    }
  });
}
