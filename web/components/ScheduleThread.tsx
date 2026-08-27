import Image from "next/image";
import { DashboardDay } from "@/lib/data";
import { EditableText } from "./EditableText";

export function ScheduleThread({ days, canEdit }: { days: DashboardDay[]; canEdit: boolean }) {
  if (days.length === 0) {
    return <p className="text-sm text-slate-400">아직 등록된 일정이 없어요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <article key={day.dayNumber} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">{day.dayNumber}일차</span>
          </div>

          {day.items.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {day.items.map((item) => (
                <li key={item.id} className="text-sm text-slate-800">
                  <EditableText
                    initialValue={item.content}
                    canEdit={canEdit}
                    endpoint={`/api/schedule/${item.id}`}
                    field="content"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">등록된 일정 내용이 없어요.</p>
          )}

          {day.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {day.photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <Image src={photo.storageUrl} alt={photo.locationTag ?? "여행 사진"} fill className="object-cover" sizes="200px" />
                  {photo.locationTag && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                      {photo.locationTag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
