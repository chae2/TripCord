import { Interaction } from "discord.js";
import { TripCordClient } from "../discordClient";
import { GALLERY_PREFIX, galleryButtons, parseGalleryCustomId } from "../utils/pagination";
import { listPhotos } from "../db/repositories/photoRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";

export function registerInteractionCreate(client: TripCordClient): void {
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`[command:${interaction.commandName}] 실행 실패:`, err);
        const payload = { embeds: [errorEmbed("명령을 처리하는 중 오류가 발생했어요.")] };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => undefined);
        } else {
          await interaction.reply({ ...payload, ephemeral: true }).catch(() => undefined);
        }
      }
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(GALLERY_PREFIX)) {
      const { direction, tripId, index, filter } = parseGalleryCustomId(interaction.customId);
      const photos = await listPhotos({ tripId, dayNumber: filter.dayNumber, locationTag: filter.locationTag });

      if (photos.length === 0) {
        await interaction.update({ embeds: [errorEmbed("사진을 찾을 수 없어요.")], components: [] });
        return;
      }

      const nextIndex = direction === "next" ? Math.min(index + 1, photos.length - 1) : Math.max(index - 1, 0);
      const photo = photos[nextIndex]!;

      const embed = baseEmbed(`갤러리 (${nextIndex + 1}/${photos.length})`)
        .setImage(photo.storageUrl)
        .addFields(
          { name: "업로더", value: `<@${photo.uploaderId}>`, inline: true },
          { name: "일차", value: photo.dayNumber ? `${photo.dayNumber}일차` : "미상", inline: true },
          { name: "위치", value: photo.locationTag ?? "미상", inline: true }
        );

      await interaction.update({
        embeds: [embed],
        components: [galleryButtons(tripId, nextIndex, photos.length, filter)],
      });
    }
  });
}
