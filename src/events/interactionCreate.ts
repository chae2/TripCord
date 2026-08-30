import { Interaction, MessageFlags } from "discord.js";
import { TripCordClient } from "../discordClient";
import { GALLERY_PREFIX, galleryButtons, parseGalleryCustomId } from "../utils/pagination";
import { PACKING_TOGGLE_PREFIX, buildPackingButtons, buildPackingEmbed, parsePackingToggleCustomId } from "../utils/packingView";
import { listPhotos } from "../db/repositories/photoRepo";
import { getActiveTrip } from "../db/repositories/tripRepo";
import { ensureParticipant } from "../db/repositories/participantRepo";
import { listRoleNames } from "../db/repositories/roleRepo";
import { listPersonalItems, listSharedItems, toggleChecked } from "../db/repositories/packingRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";

export function registerInteractionCreate(client: TripCordClient): void {
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isAutocomplete()) {
      // 자동완성은 defer가 불가능해 3초 안에 반드시 응답해야 한다 - DB 조회가 실패/지연되면 빈 목록으로 폴백한다.
      try {
        if (interaction.commandName === "역할" && interaction.options.getFocused(true).name === "역할") {
          if (!interaction.guildId) {
            await interaction.respond([]);
            return;
          }
          const trip = await getActiveTrip(interaction.guildId);
          if (!trip) {
            await interaction.respond([]);
            return;
          }
          const typed = String(interaction.options.getFocused()).toLowerCase();
          const names = await listRoleNames(trip.id);
          const filtered = names.filter((n) => n.toLowerCase().includes(typed)).slice(0, 25);
          await interaction.respond(filtered.map((n) => ({ name: n, value: n })));
        }
      } catch (err) {
        console.error("[interactionCreate] 자동완성 실패:", err);
        await interaction.respond([]).catch(() => undefined);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // 참가자 명단 upsert는 커맨드 응답을 지연시킬 이유가 없으므로 기다리지 않고 백그라운드로 흘려보낸다
      // (3초 응답 제한 안에 명령 자체를 처리하는 게 우선이고, 이 값은 웹 대시보드 표시용 부가 정보일 뿐이다).
      if (interaction.guildId) {
        void (async () => {
          const trip = await getActiveTrip(interaction.guildId!);
          if (!trip) return;
          await ensureParticipant({
            tripId: trip.id,
            discordUserId: interaction.user.id,
            displayName: interaction.user.displayName ?? interaction.user.username,
            avatarUrl: interaction.user.displayAvatarURL(),
          });
        })().catch((err) => console.error("[interactionCreate] participant upsert 실패:", err));
      }

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`[command:${interaction.commandName}] 실행 실패:`, err);
        const payload = { embeds: [errorEmbed("명령을 처리하는 중 오류가 발생했어요.")] };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => undefined);
        } else {
          await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => undefined);
        }
      }
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(GALLERY_PREFIX)) {
      // DB 조회가 3초 응답 제한을 넘길 수 있으므로 먼저 defer한다 (update 대신 deferUpdate + editReply 조합 사용).
      await interaction.deferUpdate();

      const { direction, tripId, index, filter } = parseGalleryCustomId(interaction.customId);
      const photos = await listPhotos({ tripId, dayNumber: filter.dayNumber, locationTag: filter.locationTag });

      if (photos.length === 0) {
        await interaction.editReply({ embeds: [errorEmbed("사진을 찾을 수 없어요.")], components: [] });
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

      await interaction.editReply({
        embeds: [embed],
        components: [galleryButtons(tripId, nextIndex, photos.length, filter)],
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(PACKING_TOGGLE_PREFIX)) {
      await interaction.deferUpdate();

      const { tripId, itemId } = parsePackingToggleCustomId(interaction.customId);
      await toggleChecked(itemId);

      const [shared, personal] = await Promise.all([
        listSharedItems(tripId),
        listPersonalItems(tripId, interaction.user.id),
      ]);

      await interaction.editReply({
        embeds: [buildPackingEmbed("준비물", shared, personal)],
        components: buildPackingButtons(tripId, shared, personal),
      });
    }
  });
}
