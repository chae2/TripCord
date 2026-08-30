import { Client, TextChannel } from "discord.js";
import { endTrip, getGuildNotifyChannelId, getTripsPastEndDate } from "../db/repositories/tripRepo";
import { baseEmbed } from "../utils/embeds";

export async function autoEndPastTrips(client: Client): Promise<void> {
  const now = new Date();
  const trips = await getTripsPastEndDate(now);

  for (const trip of trips) {
    try {
      await endTrip(trip.guildId);

      const channelId = await getGuildNotifyChannelId(trip.guildId);
      if (!channelId) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) continue;

      await channel.send({
        embeds: [baseEmbed(`${trip.destination} 여행이 자동으로 종료됐어요`).setDescription("수고하셨습니다! `/여행등록`으로 다음 여행을 시작할 수 있어요.")],
      });
    } catch (err) {
      console.error(`[tripAutoEnd] trip ${trip.id} 자동 종료 실패:`, err);
    }
  }
}
