import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { listScheduleItems } from "../db/repositories/scheduleRepo";
import { searchByCategory } from "../services/placeSearchRouter";
import { dayNumberFor } from "../utils/dateHelpers";
import { baseEmbed, errorEmbed } from "../utils/embeds";

async function resolveRegion(tripId: string, tripStartDate: Date, fallback: string): Promise<string | null> {
  const today = dayNumberFor(tripStartDate, new Date());
  const todayItems = await listScheduleItems(tripId, today);
  const withLocation = todayItems.find((item) => item.location);
  if (withLocation?.location) return withLocation.location;
  return fallback || null;
}

function buildMealCommand(name: string, mealLabel: string): Command {
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(`${mealLabel} 지역 특산물/향토음식 맛집을 추천합니다`)
      .addStringOption((opt) => opt.setName("장소").setDescription("검색할 지역 (기본: 오늘 일정 위치 → 여행지)").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
      const trip = await requireActiveTrip(interaction);
      if (!trip) return;

      const inputRegion = interaction.options.getString("장소");
      const region = inputRegion ?? (await resolveRegion(trip.id, trip.startDate, trip.destination));

      if (!region) {
        await interaction.editReply({
          embeds: [errorEmbed("추천할 지역을 찾지 못했어요. `장소` 옵션으로 직접 알려주세요.")],
        });
        return;
      }

      try {
        const { places, provider } = await searchByCategory("맛집", region, "향토음식 맛집");
        if (places.length === 0) {
          await interaction.editReply({ embeds: [errorEmbed("검색 결과가 없어요.")] });
          return;
        }

        const embed = baseEmbed(`${mealLabel === "점심" ? "🍚" : "🌙"} ${region} ${mealLabel} 추천 (${provider})`).setDescription(
          places.map((p) => `**${p.name}** (${p.category})\n${p.address}${p.url ? `\n${p.url}` : ""}`).join("\n\n")
        );
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        await interaction.editReply({ embeds: [errorEmbed(err instanceof Error ? err.message : "검색 중 오류가 발생했어요.")] });
      }
    },
  };
}

export const commands: Command[] = [buildMealCommand("점메추", "점심"), buildMealCommand("저메추", "저녁")];
