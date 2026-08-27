import { prisma } from "../client";

export async function ensureParticipant(params: {
  tripId: string;
  discordUserId: string;
  displayName: string;
  avatarUrl?: string;
}): Promise<void> {
  await prisma.participant.upsert({
    where: { tripId_discordUserId: { tripId: params.tripId, discordUserId: params.discordUserId } },
    update: { displayName: params.displayName, avatarUrl: params.avatarUrl },
    create: {
      tripId: params.tripId,
      discordUserId: params.discordUserId,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
    },
  });
}

export async function setBio(params: {
  tripId: string;
  discordUserId: string;
  bio: string;
  displayName: string;
  avatarUrl?: string;
}): Promise<void> {
  // interactionCreate의 참가자 upsert는 응답 지연을 막기 위해 백그라운드로 흘려보내므로,
  // 순서가 보장되지 않아도 되도록 여기서도 upsert로 자체 완결되게 한다.
  await prisma.participant.upsert({
    where: { tripId_discordUserId: { tripId: params.tripId, discordUserId: params.discordUserId } },
    update: { bio: params.bio },
    create: {
      tripId: params.tripId,
      discordUserId: params.discordUserId,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
      bio: params.bio,
    },
  });
}

export async function listParticipants(tripId: string) {
  return prisma.participant.findMany({ where: { tripId }, orderBy: { displayName: "asc" } });
}
