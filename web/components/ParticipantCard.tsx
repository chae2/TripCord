import Image from "next/image";
import { DashboardParticipant } from "@/lib/data";
import { RoleBadge } from "./RoleBadge";
import { EditableText } from "./EditableText";

function IntroRow({
  label,
  value,
  canEdit,
  endpoint,
  field,
}: {
  label: string;
  value: string | null;
  canEdit: boolean;
  endpoint: string;
  field: string;
}) {
  if (!canEdit && !value) return null;
  return (
    <div className="mt-1 text-xs text-slate-500">
      <span className="font-medium text-slate-400">{label}: </span>
      <EditableText initialValue={value ?? ""} canEdit={canEdit} endpoint={endpoint} field={field} emptyLabel="-" />
    </div>
  );
}

export function ParticipantCard({
  participant,
  canEdit,
}: {
  participant: DashboardParticipant;
  canEdit: boolean;
}) {
  const initial = participant.displayName.slice(0, 1).toUpperCase();
  const endpoint = `/api/participants/${participant.id}`;

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
        <p className="font-semibold text-slate-900">
          {participant.introName ?? participant.displayName}
          {participant.nickname && <span className="ml-1 font-normal text-slate-400">({participant.nickname})</span>}
        </p>
        {participant.roles.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {participant.roles.map((role) => (
              <RoleBadge key={role} name={role} />
            ))}
          </div>
        )}
        <IntroRow label="좋아하는 것" value={participant.likes} canEdit={canEdit} endpoint={endpoint} field="likes" />
        <IntroRow label="싫어하는 것" value={participant.dislikes} canEdit={canEdit} endpoint={endpoint} field="dislikes" />
        <IntroRow label="특이사항" value={participant.quirks} canEdit={canEdit} endpoint={endpoint} field="quirks" />
        <IntroRow label="이외" value={participant.extra} canEdit={canEdit} endpoint={endpoint} field="extra" />
      </div>
    </div>
  );
}
