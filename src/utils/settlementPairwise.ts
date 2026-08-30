export interface DebtTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * 유저별 순잔액(양수=받을 돈, 음수=낼 돈)을 받아 "누가 누구에게 얼마"로 단순화한다.
 * 채권자/채무자를 금액 큰 순으로 정렬해 그리디로 매칭 — 필요한 송금 건수를 최소화한다.
 */
export function simplifyDebts(net: Map<string, number>): DebtTransfer[] {
  const creditors = Array.from(net.entries())
    .filter(([, amount]) => amount > 0)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Array.from(net.entries())
    .filter(([, amount]) => amount < 0)
    .map(([userId, amount]) => ({ userId, amount: -amount }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amount });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transfers;
}
