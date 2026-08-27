import Image from "next/image";
import { DashboardParticipant } from "@/lib/data";
import { RoleBadge } from "./RoleBadge";
import { EditableText } from "./EditableText";

export function ParticipantCard({
  participant,
  canEdit,
}: {
  participant: DashboardParticipant;
  canEdit: boolean;
}) {
  const initial = participant.displayName.slice(0, 1).toUpperCase();

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {participant.avatarUrl ? (
        <Image
          src={participant.avatarUrl}
          alt={participant.displayName}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-light text-lg font-semibold text-accent-dark">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{participant.displayName}</p>
        {participant.roles.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {participant.roles.map((role) => (
              <RoleBadge key={role} name={role} />
            ))}
          </div>
        )}
        <div className="mt-2 text-sm text-slate-600">
          <EditableText
            initialValue={participant.bio ?? ""}
            canEdit={canEdit}
            endpoint={`/api/participants/${participant.id}`}
            field="bio"
            placeholder="한 줄 소개를 입력하세요"
            emptyLabel="소개가 없어요"
          />
        </div>
      </div>
    </div>
  );
}
