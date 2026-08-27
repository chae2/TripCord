import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Trip } from "@prisma/client";
import { getActiveTrip } from "../db/repositories/tripRepo";
import { errorEmbed } from "../utils/embeds";

/** 활성 여행을 가져오고, 없으면 에러 응답까지 처리한다. 호출부는 반환값이 null이면 바로 return하면 된다. */
export async function requireActiveTrip(interaction: ChatInputCommandInteraction): Promise<Trip | null> {
  if (!interaction.guildId) {
    await interaction.reply({ embeds: [errorEmbed("서버 안에서만 사용할 수 있어요.")], flags: MessageFlags.Ephemeral });
    return null;
  }

  const trip = await getActiveTrip(interaction.guildId);
  if (!trip) {
    await interaction.reply({
      embeds: [errorEmbed("등록된 활성 여행이 없어요. `/여행등록`으로 먼저 여행을 등록해주세요.")],
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  return trip;
}
