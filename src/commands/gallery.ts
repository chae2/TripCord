import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { listPhotos } from "../db/repositories/photoRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";
import { galleryButtons } from "../utils/pagination";
import { env } from "../config/env";

const galleryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("갤러리")
    .setDescription("여행 사진을 필터링해서 봅니다")
    .addIntegerOption((opt) => opt.setName("일차").setDescription("특정 일차 사진만 보기").setRequired(false).setMinValue(1))
    .addStringOption((opt) => opt.setName("위치").setDescription("특정 위치 태그로 보기").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const dayNumber = interaction.options.getInteger("일차") ?? undefined;
    const locationTag = interaction.options.getString("위치") ?? undefined;

    const photos = await listPhotos({ tripId: trip.id, dayNumber, locationTag });

    if (photos.length === 0) {
      await interaction.editReply({
        embeds: [errorEmbed("조건에 맞는 사진이 없어요. 사진을 채널에 올리면 자동으로 갤러리에 모여요.")],
      });
      return;
    }

    const index = 0;
    const photo = photos[index]!;
    const embed = baseEmbed(`${trip.destination} 갤러리 (${index + 1}/${photos.length})`)
      .setImage(photo.storageUrl)
      .addFields(
        { name: "업로더", value: `<@${photo.uploaderId}>`, inline: true },
        { name: "일차", value: photo.dayNumber ? `${photo.dayNumber}일차` : "미상", inline: true },
        { name: "위치", value: photo.locationTag ?? "미상", inline: true }
      );
    if (env.webBaseUrl) {
      embed.setFooter({ text: "전체 사진과 일정은 웹 대시보드에서 한눈에 볼 수 있어요" }).setURL(env.webBaseUrl);
    }

    await interaction.editReply({
      embeds: [embed],
      components: [galleryButtons(trip.id, index, photos.length, { dayNumber, locationTag })],
    });
  },
};

export const commands: Command[] = [galleryCommand];
