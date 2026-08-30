import cron from "node-cron";
import { TripCordClient } from "../discordClient";
import { pollWeatherForUpcomingTrips } from "../scheduler/weatherPolling";
import { sendDailyReminders } from "../scheduler/dailyReminder";
import { announceTodaysSchedule } from "../scheduler/scheduleAnnouncement";
import { autoEndPastTrips } from "../scheduler/tripAutoEnd";
import { env } from "../config/env";

export function registerReady(client: TripCordClient): void {
  client.once("ready", () => {
    console.log(`[ready] TripCord 로그인됨: ${client.user?.tag}`);

    // 매시 정각: 출발 48시간 이내 여행의 날씨를 폴링
    cron.schedule(
      "0 * * * *",
      () => {
        pollWeatherForUpcomingTrips().catch((err) => console.error("[cron] weatherPolling 실패:", err));
      },
      { timezone: env.timezone }
    );

    // 매일 20:00: 내일 출발하는 여행에 날씨/준비물 알림
    cron.schedule(
      "0 20 * * *",
      () => {
        sendDailyReminders(client).catch((err) => console.error("[cron] dailyReminder 실패:", err));
      },
      { timezone: env.timezone }
    );

    // 매일 08:00: 진행 중인 여행의 오늘 일정 안내
    cron.schedule(
      "0 8 * * *",
      () => {
        announceTodaysSchedule(client).catch((err) => console.error("[cron] scheduleAnnouncement 실패:", err));
      },
      { timezone: env.timezone }
    );

    // 매일 00:05: 종료일이 지난 여행 자동 종료
    cron.schedule(
      "5 0 * * *",
      () => {
        autoEndPastTrips(client).catch((err) => console.error("[cron] tripAutoEnd 실패:", err));
      },
      { timezone: env.timezone }
    );
  });
}
