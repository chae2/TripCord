import { Trip, TripStatus } from "@prisma/client";
import { prisma } from "../client";

export async function getActiveTrip(guildId: string): Promise<Trip | null> {
  return prisma.trip.findFirst({
    where: { guildId, status: { in: [TripStatus.PLANNING, TripStatus.ONGOING] } },
  });
}

export async function createTrip(params: {
  guildId: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  notifyChannelId?: string;
}): Promise<Trip> {
  const existing = await getActiveTrip(params.guildId);
  if (existing) {
    throw new Error("ACTIVE_TRIP_EXISTS");
  }

  await prisma.guild.upsert({
    where: { id: params.guildId },
    update: params.notifyChannelId ? { notifyChannelId: params.notifyChannelId } : {},
    create: { id: params.guildId, notifyChannelId: params.notifyChannelId },
  });

  const trip = await prisma.trip.create({
    data: {
      guildId: params.guildId,
      destination: params.destination,
      startDate: params.startDate,
      endDate: params.endDate,
      status: TripStatus.PLANNING,
    },
  });

  await prisma.guild.update({
    where: { id: params.guildId },
    data: { activeTripId: trip.id },
  });

  return trip;
}

export async function endTrip(guildId: string): Promise<Trip> {
  const trip = await getActiveTrip(guildId);
  if (!trip) {
    throw new Error("NO_ACTIVE_TRIP");
  }

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: { status: TripStatus.DONE },
  });

  await prisma.guild.update({
    where: { id: guildId },
    data: { activeTripId: null },
  });

  return updated;
}

export async function getTripsNeedingWeatherPoll(now: Date): Promise<Trip[]> {
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return prisma.trip.findMany({
    where: {
      status: { in: [TripStatus.PLANNING, TripStatus.ONGOING] },
      startDate: { gt: now, lte: in48h },
    },
  });
}

export async function getTripsStartingTomorrow(now: Date): Promise<Trip[]> {
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setHours(0, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

  return prisma.trip.findMany({
    where: {
      status: { in: [TripStatus.PLANNING, TripStatus.ONGOING] },
      startDate: { gte: startOfTomorrow, lt: endOfTomorrow },
      dailyReminderSentAt: null,
    },
  });
}

export async function markWeatherPolled(tripId: string, when: Date): Promise<void> {
  await prisma.trip.update({ where: { id: tripId }, data: { weatherLastPolledAt: when } });
}

export async function markDailyReminderSent(tripId: string, when: Date): Promise<void> {
  await prisma.trip.update({ where: { id: tripId }, data: { dailyReminderSentAt: when } });
}

export async function getGuildNotifyChannelId(guildId: string): Promise<string | null> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  return guild?.notifyChannelId ?? null;
}
