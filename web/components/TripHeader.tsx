import { TripStatus } from "@prisma/client";

const statusLabel: Record<TripStatus, string> = {
  PLANNING: "준비 중",
  ONGOING: "진행 중",
  DONE: "종료됨",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

function dDayLabel(startDate: Date, status: TripStatus): string {
  if (status === "DONE") return "여행 종료";
  const diff = Math.ceil((startDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return "여행 중";
}

export function TripHeader({
  destination,
  startDate,
  endDate,
  status,
}: {
  destination: string;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
}) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-accent">{statusLabel[status]}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{destination}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {formatDate(startDate)} – {formatDate(endDate)}
        </p>
      </div>
      <div className="rounded-2xl bg-accent-light px-4 py-2 text-center">
        <p className="text-lg font-bold text-accent-dark">{dDayLabel(startDate, status)}</p>
      </div>
    </header>
  );
}
