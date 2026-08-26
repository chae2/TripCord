import { Photo } from "@prisma/client";
import { prisma } from "../client";

export async function addPhoto(params: {
  tripId: string;
  discordMessageId: string;
  uploaderId: string;
  storageUrl: string;
  postedAt: Date;
  dayNumber?: number;
  locationTag?: string;
}): Promise<Photo> {
  return prisma.photo.create({ data: params });
}

export async function listPhotos(params: {
  tripId: string;
  dayNumber?: number;
  locationTag?: string;
}): Promise<Photo[]> {
  return prisma.photo.findMany({
    where: {
      tripId: params.tripId,
      ...(params.dayNumber !== undefined ? { dayNumber: params.dayNumber } : {}),
      ...(params.locationTag ? { locationTag: params.locationTag } : {}),
    },
    orderBy: { postedAt: "asc" },
  });
}
