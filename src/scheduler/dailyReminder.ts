import { Client, TextChannel } from "discord.js";
import { getGuildNotifyChannelId, getTripsStartingTomorrow, markDailyReminderSent } from "../db/repositories/tripRepo";
import { getLatestSnapshotsForDay } from "../db/repositories/weatherRepo";
import { listUncheckedByTrip } from "../db/repositories/packingRepo";
import { baseEmbed } from "../utils/embeds";

export async function sendDailyReminders(client: Client): Promise<void> {
  const now = new Date();
  const trips = await getTripsStartingTomorrow(now);

  for (const trip of trips) {
    try {
      const channelId = await getGuildNotifyChannelId(trip.guildId);
      if (!channelId) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) continue;

      const snapshots = await getLatestSnapshotsForDay(trip.id, trip.startDate);
      const weatherSummary =
        snapshots.length > 0
          ? snapshots
              .map((s) => `${s.forecastFor.getHours()}시: ${s.tempC.toFixed(1)}°C, ${s.condition}`)
              .join("\n")
          : "날씨 정보를 아직 확인하지 못했어요.";

      const unchecked = await listUncheckedByTrip(trip.id);
      const sharedItems = unchecked.filter((i) => i.scope === "SHARED").map((i) => i.item);
      const byUser = new Map<string, string[]>();
      for (const item of unchecked) {
        if (item.scope !== "PERSONAL") continue;
        const list = byUser.get(item.userId) ?? [];
        list.push(item.item);
        byUser.set(item.userId, list);
      }
      const summaryLines: string[] = [];
      if (sharedItems.length > 0) summaryLines.push(`공통: ${sharedItems.join(", ")}`);
      for (const [userId, items] of byUser.entries()) {
        summaryLines.push(`<@${userId}>: ${items.join(", ")}`);
      }
      const packingSummary = summaryLines.length > 0 ? summaryLines.join("\n") : "미체크 준비물이 없어요.";

      const embed = baseEmbed(`내일 출발! ${trip.destination} 여행 준비 🧳`)
        .addFields(
          { name: "내일 날씨 예보", value: weatherSummary },
          { name: "아직 안 챙긴 준비물", value: packingSummary }
        );

      await channel.send({ embeds: [embed] });
      await markDailyReminderSent(trip.id, now);
    } catch (err) {
      console.error(`[dailyReminder] trip ${trip.id} 알림 실패:`, err);
    }
  }
}
