import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { createTrip, endTrip } from "../db/repositories/tripRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";
import { parseDateInput } from "../utils/dateHelpers";

const registerTrip: Command = {
  data: new SlashCommandBuilder()
    .setName("여행등록")
    .setDescription("이 서버의 활성 여행을 새로 등록합니다")
    .addStringOption((opt) => opt.setName("목적지").setDescription("여행지").setRequired(true))
    .addStringOption((opt) => opt.setName("시작일").setDescription("YYYY-MM-DD").setRequired(true))
    .addStringOption((opt) => opt.setName("종료일").setDescription("YYYY-MM-DD").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [errorEmbed("서버 안에서만 사용할 수 있어요.")], ephemeral: true });
      return;
    }

    const destination = interaction.options.getString("목적지", true);
    const startDateInput = interaction.options.getString("시작일", true);
    const endDateInput = interaction.options.getString("종료일", true);

    try {
      const startDate = parseDateInput(startDateInput);
      const endDate = parseDateInput(endDateInput);
      if (endDate < startDate) {
        await interaction.reply({ embeds: [errorEmbed("종료일이 시작일보다 빠릅니다.")], ephemeral: true });
        return;
      }

      const trip = await createTrip({
        guildId: interaction.guildId,
        destination,
        startDate,
        endDate,
        notifyChannelId: interaction.channelId,
      });

      const embed = baseEmbed("여행이 등록되었어요 🧳")
        .addFields(
          { name: "목적지", value: trip.destination, inline: true },
          { name: "기간", value: `${startDateInput} ~ ${endDateInput}`, inline: true }
        )
        .setDescription("출발 이틀 전부터 날씨를 확인하고, 전날 저녁에 날씨/준비물을 알려드릴게요.");

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      if (err instanceof Error && err.message === "ACTIVE_TRIP_EXISTS") {
        await interaction.reply({
          embeds: [errorEmbed("이미 진행 중인 활성 여행이 있어요. `/여행종료`로 먼저 마무리해주세요.")],
          ephemeral: true,
        });
        return;
      }
      if (err instanceof Error && err.message.startsWith("INVALID_DATE")) {
        await interaction.reply({
          embeds: [errorEmbed("날짜 형식이 올바르지 않아요. 예: 2026-09-01")],
          ephemeral: true,
        });
        return;
      }
      throw err;
    }
  },
};

const endTripCommand: Command = {
  data: new SlashCommandBuilder().setName("여행종료").setDescription("이 서버의 활성 여행을 종료합니다"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [errorEmbed("서버 안에서만 사용할 수 있어요.")], ephemeral: true });
      return;
    }

    try {
      const trip = await endTrip(interaction.guildId);
      await interaction.reply({ embeds: [baseEmbed("여행이 종료되었어요").setDescription(`${trip.destination} 여행 기록은 계속 조회할 수 있어요. 수고하셨습니다!`)] });
    } catch (err) {
      if (err instanceof Error && err.message === "NO_ACTIVE_TRIP") {
        await interaction.reply({ embeds: [errorEmbed("진행 중인 활성 여행이 없어요.")], ephemeral: true });
        return;
      }
      throw err;
    }
  },
};

export const commands: Command[] = [registerTrip, endTripCommand];
