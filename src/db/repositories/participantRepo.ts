import { Participant } from "@prisma/client";
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

export interface IntroFields {
  introName: string;
  nickname?: string;
  likes?: string;
  dislikes?: string;
  quirks?: string;
  extra?: string;
}

export async function setIntro(params: {
  tripId: string;
  discordUserId: string;
  displayName: string;
  avatarUrl?: string;
  intro: IntroFields;
}): Promise<void> {
  // interactionCreate의 참가자 upsert는 응답 지연을 막기 위해 백그라운드로 흘려보내므로,
  // 순서가 보장되지 않아도 되도록 여기서도 upsert로 자체 완결되게 한다.
  await prisma.participant.upsert({
    where: { tripId_discordUserId: { tripId: params.tripId, discordUserId: params.discordUserId } },
    update: { ...params.intro },
    create: {
      tripId: params.tripId,
      discordUserId: params.discordUserId,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
      ...params.intro,
    },
  });
}

export async function getParticipant(tripId: string, discordUserId: string): Promise<Participant | null> {
  return prisma.participant.findUnique({ where: { tripId_discordUserId: { tripId, discordUserId } } });
}

export async function listParticipants(tripId: string) {
  return prisma.participant.findMany({ where: { tripId }, orderBy: { displayName: "asc" } });
}
