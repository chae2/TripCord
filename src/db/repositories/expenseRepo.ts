import { prisma } from "../client";
import { splitEvenly } from "../../utils/split";

export async function recordExpense(params: {
  tripId: string;
  payerId: string;
  amount: number;
  memo?: string;
  mentionedUserIds: string[];
}) {
  const participantIds = Array.from(new Set([params.payerId, ...params.mentionedUserIds]));
  const shares = splitEvenly(params.amount, participantIds);

  return prisma.expense.create({
    data: {
      tripId: params.tripId,
      payerId: params.payerId,
      amount: params.amount,
      memo: params.memo,
      shares: {
        create: participantIds.map((userId) => ({
          userId,
          shareAmount: shares.get(userId) ?? 0,
        })),
      },
    },
    include: { shares: true },
  });
}

export type Balance = { userId: string; netAmount: number };

export async function getBalances(tripId: string): Promise<Balance[]> {
  const expenses = await prisma.expense.findMany({
    where: { tripId },
    include: { shares: true },
  });

  const net = new Map<string, number>();
  const bump = (userId: string, delta: number) => net.set(userId, (net.get(userId) ?? 0) + delta);

  for (const expense of expenses) {
    bump(expense.payerId, expense.amount);
    for (const share of expense.shares) {
      bump(share.userId, -share.shareAmount);
    }
  }

  return Array.from(net.entries())
    .map(([userId, netAmount]) => ({ userId, netAmount }))
    .sort((a, b) => b.netAmount - a.netAmount);
}

export async function resetExpenses(tripId: string): Promise<void> {
  await prisma.expense.deleteMany({ where: { tripId } });
}
