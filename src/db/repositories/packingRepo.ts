import { PackingItem, PackingScope } from "@prisma/client";
import { prisma } from "../client";

export async function addPackingItems(params: {
  tripId: string;
  userId: string;
  scope: PackingScope;
  items: string[];
}): Promise<PackingItem[]> {
  await prisma.packingItem.createMany({
    data: params.items.map((item) => ({
      tripId: params.tripId,
      userId: params.userId,
      scope: params.scope,
      item,
    })),
  });

  return prisma.packingItem.findMany({
    where: { tripId: params.tripId, userId: params.userId, scope: params.scope, item: { in: params.items } },
    orderBy: { createdAt: "desc" },
    take: params.items.length,
  });
}

export async function listPersonalItems(tripId: string, userId: string): Promise<PackingItem[]> {
  return prisma.packingItem.findMany({
    where: { tripId, userId, scope: PackingScope.PERSONAL },
    orderBy: { createdAt: "asc" },
  });
}

export async function listSharedItems(tripId: string): Promise<PackingItem[]> {
  return prisma.packingItem.findMany({
    where: { tripId, scope: PackingScope.SHARED },
    orderBy: { createdAt: "asc" },
  });
}

export async function toggleChecked(itemId: string): Promise<PackingItem | null> {
  const item = await prisma.packingItem.findUnique({ where: { id: itemId } });
  if (!item) return null;
  return prisma.packingItem.update({ where: { id: itemId }, data: { checked: !item.checked } });
}

export async function listUncheckedByTrip(tripId: string): Promise<PackingItem[]> {
  return prisma.packingItem.findMany({
    where: { tripId, checked: false },
    orderBy: { userId: "asc" },
  });
}
