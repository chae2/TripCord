import { TripStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { DebtTransfer, simplifyDebts } from "./settlementPairwise";

export interface DashboardParticipant {
  id: string;
  discordUserId: string;
  displayName: string;
  avatarUrl: string | null;
  introName: string | null;
  nickname: string | null;
  likes: string | null;
  dislikes: string | null;
  quirks: string | null;
  extra: string | null;
  roles: string[];
}

export interface DashboardDay {
  dayNumber: number;
  items: { id: string; content: string; location: string | null; time: string | null }[];
  photos: { id: string; storageUrl: string; uploaderId: string; locationTag: string | null }[];
}

export interface DashboardData {
  trip: {
    id: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    status: TripStatus;
  };
  participants: DashboardParticipant[];
  days: DashboardDay[];
  transfers: DebtTransfer[];
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const guildFilter = process.env.GUILD_ID ? { guildId: process.env.GUILD_ID } : {};

  const trip =
    (await prisma.trip.findFirst({
      where: { ...guildFilter, status: { in: [TripStatus.PLANNING, TripStatus.ONGOING] } },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.trip.findFirst({
      where: guildFilter,
      orderBy: { createdAt: "desc" },
    }));

  if (!trip) return null;

  const [participants, roles, scheduleItems, photos, expenses] = await Promise.all([
    prisma.participant.findMany({ where: { tripId: trip.id }, orderBy: { displayName: "asc" } }),
    prisma.role.findMany({ where: { tripId: trip.id }, include: { assignments: true } }),
    prisma.scheduleItem.findMany({ where: { tripId: trip.id }, orderBy: [{ dayNumber: "asc" }, { createdAt: "asc" }] }),
    prisma.photo.findMany({ where: { tripId: trip.id }, orderBy: { postedAt: "asc" } }),
    prisma.expense.findMany({ where: { tripId: trip.id }, include: { shares: true } }),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const role of roles) {
    for (const assignment of role.assignments) {
      const list = rolesByUser.get(assignment.userId) ?? [];
      list.push(role.name);
      rolesByUser.set(assignment.userId, list);
    }
  }

  const dashboardParticipants: DashboardParticipant[] = participants.map((p) => ({
    id: p.id,
    discordUserId: p.discordUserId,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    introName: p.introName,
    nickname: p.nickname,
    likes: p.likes,
    dislikes: p.dislikes,
    quirks: p.quirks,
    extra: p.extra,
    roles: rolesByUser.get(p.discordUserId) ?? [],
  }));

  const dayMap = new Map<number, DashboardDay>();
  const dayFor = (dayNumber: number) => {
    let day = dayMap.get(dayNumber);
    if (!day) {
      day = { dayNumber, items: [], photos: [] };
      dayMap.set(dayNumber, day);
    }
    return day;
  };

  for (const item of scheduleItems) {
    dayFor(item.dayNumber).items.push({ id: item.id, content: item.content, location: item.location, time: item.time });
  }
  for (const photo of photos) {
    if (photo.dayNumber === null) continue;
    dayFor(photo.dayNumber).photos.push({
      id: photo.id,
      storageUrl: photo.storageUrl,
      uploaderId: photo.uploaderId,
      locationTag: photo.locationTag,
    });
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber);

  const net = new Map<string, number>();
  const bump = (userId: string, delta: number) => net.set(userId, (net.get(userId) ?? 0) + delta);
  for (const expense of expenses) {
    bump(expense.payerId, expense.amount);
    for (const share of expense.shares) bump(share.userId, -share.shareAmount);
  }
  const transfers = simplifyDebts(net);

  return {
    trip: {
      id: trip.id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
    },
    participants: dashboardParticipants,
    days,
    transfers,
  };
}
