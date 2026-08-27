import { DashboardBalance, DashboardParticipant } from "@/lib/data";

function displayName(participants: DashboardParticipant[], userId: string): string {
  return participants.find((p) => p.discordUserId === userId)?.displayName ?? userId;
}

export function SettlementTable({
  balances,
  participants,
}: {
  balances: DashboardBalance[];
  participants: DashboardParticipant[];
}) {
  if (balances.length === 0) {
    return <p className="text-sm text-slate-400">아직 기록된 정산이 없어요.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <tbody>
          {balances.map((b, i) => (
            <tr key={b.userId} className={i !== balances.length - 1 ? "border-b border-slate-100" : ""}>
              <td className="px-4 py-3 font-medium text-slate-800">{displayName(participants, b.userId)}</td>
              <td
                className={`px-4 py-3 text-right font-semibold ${
                  b.netAmount > 0 ? "text-accent-dark" : b.netAmount < 0 ? "text-red-500" : "text-slate-400"
                }`}
              >
                {b.netAmount > 0 ? "받을 돈 " : b.netAmount < 0 ? "낼 돈 " : "정산 완료"}
                {b.netAmount !== 0 && `${Math.abs(b.netAmount).toLocaleString()}원`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
