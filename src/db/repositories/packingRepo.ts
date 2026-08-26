import { PackingItem } from "@prisma/client";
import { prisma } from "../client";

export async function addPackingItem(params: {
  tripId: string;
  userId: string;
  item: string;
}): Promise<PackingItem> {
  return prisma.packingItem.create({ data: params });
}

export async function listPackingItems(tripId: string, userId: string): Promise<PackingItem[]> {
  return prisma.packingItem.findMany({
    where: { tripId, userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function checkPackingItem(params: {
  tripId: string;
  userId: string;
  item: string;
}): Promise<number> {
  const result = await prisma.packingItem.updateMany({
    where: { tripId: params.tripId, userId: params.userId, item: params.item, checked: false },
    data: { checked: true },
  });
  return result.count;
}

export async function listUncheckedByTrip(tripId: string): Promise<PackingItem[]> {
  return prisma.packingItem.findMany({
    where: { tripId, checked: false },
    orderBy: { userId: "asc" },
  });
}
