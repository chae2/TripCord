import { DashboardParticipant } from "@/lib/data";
import { DebtTransfer } from "@/lib/settlementPairwise";

function displayName(participants: DashboardParticipant[], userId: string): string {
  return participants.find((p) => p.discordUserId === userId)?.displayName ?? userId;
}

export function SettlementTable({
  transfers,
  participants,
}: {
  transfers: DebtTransfer[];
  participants: DashboardParticipant[];
}) {
  if (transfers.length === 0) {
    return <p className="text-sm text-slate-400">정산할 내역이 없어요. 다들 깔끔해요!</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <tbody>
          {transfers.map((t, i) => (
            <tr key={`${t.fromUserId}-${t.toUserId}-${i}`} className={i !== transfers.length - 1 ? "border-b border-slate-100" : ""}>
              <td className="px-4 py-3 font-medium text-slate-800">
                {displayName(participants, t.fromUserId)}
                <span className="mx-2 text-slate-300">→</span>
                {displayName(participants, t.toUserId)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-accent-dark">{t.amount.toLocaleString()}원</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
