import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Trip } from "@prisma/client";
import { getActiveTrip } from "../db/repositories/tripRepo";
import { errorEmbed } from "../utils/embeds";

/**
 * 활성 여행을 가져오고, 없으면 에러 응답까지 처리한다. 호출부는 반환값이 null이면 바로 return하면 된다.
 * DB 조회 자체가 3초 인터랙션 응답 제한에 걸릴 수 있어(콜드 커넥션/풀 경합), 조회 직전에 먼저 defer한다.
 * 반환값이 non-null이면 이 시점에 이미 deferReply가 호출된 상태이므로, 호출부는 반드시 reply가 아닌
 * editReply를 사용해야 한다.
 */
export async function requireActiveTrip(
  interaction: ChatInputCommandInteraction,
  options?: { ephemeral?: boolean }
): Promise<Trip | null> {
  if (!interaction.guildId) {
    await interaction.reply({ embeds: [errorEmbed("서버 안에서만 사용할 수 있어요.")], flags: MessageFlags.Ephemeral });
    return null;
  }

  await interaction.deferReply(options?.ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);

  const trip = await getActiveTrip(interaction.guildId);
  if (!trip) {
    await interaction.editReply({
      embeds: [errorEmbed("등록된 활성 여행이 없어요. `/여행등록`으로 먼저 여행을 등록해주세요.")],
    });
    return null;
  }

  return trip;
}
