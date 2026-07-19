import type { Client } from "discord.js";
import type { SeerrClient } from "../seerr/client";
import type { MediaType } from "../types";

export function registerInteractions(client: Client, seerr: SeerrClient): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("request:")) return;

    const [, mediaType, tmdbId] = interaction.customId.split(":");
    if (!mediaType || !tmdbId) return;
    if (mediaType !== "movie" && mediaType !== "tv") return;

    try {
      await interaction.deferReply({ ephemeral: true });
      await seerr.request(mediaType as MediaType, Number(tmdbId));
      await interaction.editReply(
        "Request submitted successfully. It is now waiting for approval in Seerr."
      );
    } catch (err) {
      console.error("Request button failed:", err);

      try {
        const message = (err as Error).message || "Unable to submit request.";
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
