import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { addScheduleItem, listScheduleItems } from "../db/repositories/scheduleRepo";
import { baseEmbed } from "../utils/embeds";

function formatItem(content: string, location?: string | null, time?: string | null): string {
  const parts = [content];
  if (time) parts.push(`🕐 ${time}`);
  if (location) parts.push(`📍 ${location}`);
  return parts.join(" · ");
}

const itineraryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("일정")
    .setDescription("여행 일정을 등록하거나 확인합니다 (당일 아침에 자동으로 안내돼요)")
    .addSubcommand((sub) =>
      sub
        .setName("추가")
        .setDescription("일차별 일정을 추가합니다")
        .addIntegerOption((opt) => opt.setName("일차").setDescription("몇 일차인지 (1부터)").setRequired(true).setMinValue(1))
        .addStringOption((opt) => opt.setName("내용").setDescription("일정 내용").setRequired(true))
        .addStringOption((opt) => opt.setName("위치").setDescription("장소 (텍스트 또는 링크 모두 가능)").setRequired(false))
        .addStringOption((opt) => opt.setName("시간").setDescription("예: 14:00").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("보기")
        .setDescription("등록된 일정을 확인합니다")
        .addIntegerOption((opt) => opt.setName("일차").setDescription("특정 일차만 보기").setRequired(false).setMinValue(1))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "추가") {
      const dayNumber = interaction.options.getInteger("일차", true);
      const content = interaction.options.getString("내용", true);
      const location = interaction.options.getString("위치") ?? undefined;
      const time = interaction.options.getString("시간") ?? undefined;

      await addScheduleItem({
        tripId: trip.id,
        dayNumber,
        content,
        location,
        time,
        createdBy: interaction.user.id,
      });

      await interaction.editReply({
        embeds: [
          baseEmbed(`${dayNumber}일차 일정 추가됨`).setDescription(
            `${formatItem(content, location, time)}\n\n해당 일차 당일 아침에 자동으로 안내해드릴게요.`
          ),
        ],
      });
      return;
    }

    // 보기
    const dayNumber = interaction.options.getInteger("일차") ?? undefined;
    const items = await listScheduleItems(trip.id, dayNumber);

    if (items.length === 0) {
      await interaction.editReply({ embeds: [baseEmbed("일정 없음").setDescription("아직 등록된 일정이 없어요.")] });
      return;
    }

    const grouped = new Map<number, string[]>();
    for (const item of items) {
      const list = grouped.get(item.dayNumber) ?? [];
      list.push(formatItem(item.content, item.location, item.time));
      grouped.set(item.dayNumber, list);
    }

    const embed = baseEmbed(`${trip.destination} 일정`);
    for (const [day, contents] of Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])) {
      embed.addFields({ name: `${day}일차`, value: contents.map((c) => `• ${c}`).join("\n") });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export const commands: Command[] = [itineraryCommand];
