import { ScheduleItem } from "@prisma/client";
import { prisma } from "../client";

export async function addScheduleItem(params: {
  tripId: string;
  dayNumber: number;
  content: string;
  createdBy: string;
}): Promise<ScheduleItem> {
  return prisma.scheduleItem.create({ data: params });
}

export async function listScheduleItems(tripId: string, dayNumber?: number): Promise<ScheduleItem[]> {
  return prisma.scheduleItem.findMany({
    where: { tripId, ...(dayNumber !== undefined ? { dayNumber } : {}) },
    orderBy: [{ dayNumber: "asc" }, { createdAt: "asc" }],
  });
}
