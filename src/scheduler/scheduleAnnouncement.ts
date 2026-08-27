import { Client, TextChannel } from "discord.js";
import { getGuildNotifyChannelId, getTripsInProgress } from "../db/repositories/tripRepo";
import { listUnnotifiedForDay, markNotified } from "../db/repositories/scheduleRepo";
import { dayNumberFor } from "../utils/dateHelpers";
import { baseEmbed } from "../utils/embeds";

export async function announceTodaysSchedule(client: Client): Promise<void> {
  const now = new Date();
  const trips = await getTripsInProgress(now);

  for (const trip of trips) {
    try {
      const today = dayNumberFor(trip.startDate, now);
      const items = await listUnnotifiedForDay(trip.id, today);
      if (items.length === 0) continue;

      const channelId = await getGuildNotifyChannelId(trip.guildId);
      if (!channelId) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) continue;

      for (const item of items) {
        await channel.send({
          embeds: [baseEmbed(`${today}일차 오늘의 일정 📅`).setDescription(`오늘은 "${item.content}"를 수행할 날입니다!`)],
        });
        await markNotified(item.id, now);
      }
    } catch (err) {
      console.error(`[scheduleAnnouncement] trip ${trip.id} 안내 실패:`, err);
    }
  }
}
