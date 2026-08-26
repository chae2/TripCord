import { WeatherSnapshot } from "@prisma/client";
import { prisma } from "../client";

export async function saveSnapshots(
  tripId: string,
  snapshots: { forecastFor: Date; tempC: number; condition: string }[]
): Promise<void> {
  // 시간별 예보는 매시간 다시 폴링되므로 tripId+forecastFor 기준으로 최신 값을 덮어쓴다.
  await prisma.$transaction(
    snapshots.map((s) =>
      prisma.weatherSnapshot.upsert({
        where: { tripId_forecastFor: { tripId, forecastFor: s.forecastFor } },
        update: { tempC: s.tempC, condition: s.condition, polledAt: new Date() },
        create: { tripId, forecastFor: s.forecastFor, tempC: s.tempC, condition: s.condition },
      })
    )
  );
}

export async function getLatestSnapshotsForDay(tripId: string, day: Date): Promise<WeatherSnapshot[]> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.weatherSnapshot.findMany({
    where: { tripId, forecastFor: { gte: start, lt: end } },
    orderBy: { forecastFor: "asc" },
  });
}
