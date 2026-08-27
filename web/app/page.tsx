import { getDashboardData } from "@/lib/data";
import { canEditFromCookies } from "@/lib/auth";
import { TripHeader } from "@/components/TripHeader";
import { ParticipantCard } from "@/components/ParticipantCard";
import { ScheduleThread } from "@/components/ScheduleThread";
import { SettlementTable } from "@/components/SettlementTable";
import { EditModeToggle } from "@/components/EditModeToggle";

export const dynamic = "force-dynamic";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-lg font-bold text-slate-900">{children}</h2>;
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const canEdit = canEditFromCookies();

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-lg font-semibold text-slate-700">등록된 여행이 없어요</p>
        <p className="mt-1 text-sm text-slate-400">디스코드에서 `/여행등록`으로 여행을 먼저 만들어주세요.</p>
      </div>
    );
  }

  return (
    <main>
      <div className="mb-6 flex justify-end">
        <EditModeToggle canEdit={canEdit} />
      </div>

      <TripHeader
        destination={data.trip.destination}
        startDate={data.trip.startDate}
        endDate={data.trip.endDate}
        status={data.trip.status}
      />

      <section className="mb-10">
        <SectionTitle>참여자</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.participants.map((p) => (
            <ParticipantCard key={p.id} participant={p} canEdit={canEdit} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle>일정</SectionTitle>
        <ScheduleThread days={data.days} canEdit={canEdit} />
      </section>

      <section>
        <SectionTitle>정산</SectionTitle>
        <SettlementTable balances={data.balances} participants={data.participants} />
      </section>
    </main>
  );
}
