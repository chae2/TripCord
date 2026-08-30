import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { isUserAssignedToRole } from "../db/repositories/roleRepo";
import { RecommendCategory, searchByCategory } from "../services/placeSearchRouter";
import { baseEmbed, errorEmbed } from "../utils/embeds";

const ITINERARY_ROLE_NAME = "여행 일정 조사";

const recommendCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("추천")
    .setDescription("여행지 장소를 검색해서 추천합니다")
    .addStringOption((opt) =>
      opt
        .setName("카테고리")
        .setDescription("추천받을 종류")
        .setRequired(true)
        .addChoices(
          { name: "카페", value: "카페" },
          { name: "맛집", value: "맛집" },
          { name: "놀거리", value: "놀거리" },
          { name: "기념품", value: "기념품" }
        )
    )
    .addStringOption((opt) => opt.setName("장소").setDescription("검색할 지역 (기본: 여행지)").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const isAssigned = await isUserAssignedToRole(trip.id, ITINERARY_ROLE_NAME, interaction.user.id);
    if (!isAssigned) {
      await interaction.editReply({
        embeds: [
          errorEmbed(`"${ITINERARY_ROLE_NAME}" 역할을 가진 사람만 사용할 수 있어요. \`/역할 배정 역할:${ITINERARY_ROLE_NAME}\` 로 먼저 등록해주세요.`),
        ],
      });
      return;
    }

    const category = interaction.options.getString("카테고리", true) as RecommendCategory;
    const region = interaction.options.getString("장소") ?? trip.destination;

    try {
      const { places, provider } = await searchByCategory(category, region, category);
      if (places.length === 0) {
        await interaction.editReply({ embeds: [errorEmbed("검색 결과가 없어요.")] });
        return;
      }

      const embed = baseEmbed(`📍 ${region} ${category} 추천 (${provider})`).setDescription(
        places.map((p) => `**${p.name}** (${p.category})\n${p.address}${p.url ? `\n${p.url}` : ""}`).join("\n\n")
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err instanceof Error ? err.message : "검색 중 오류가 발생했어요.")] });
    }
  },
};

export const commands: Command[] = [recommendCommand];
