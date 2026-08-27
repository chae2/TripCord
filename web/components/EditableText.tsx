"use client";

import { useState } from "react";

interface EditableTextProps {
  initialValue: string;
  canEdit: boolean;
  endpoint: string;
  field: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  emptyLabel?: string;
}

export function EditableText({
  initialValue,
  canEdit,
  endpoint,
  field,
  placeholder,
  multiline,
  className,
  emptyLabel = "아직 내용이 없어요",
}: EditableTextProps) {
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!canEdit) {
    return <p className={className}>{value || <span className="text-slate-400">{emptyLabel}</span>}</p>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`${className ?? ""} block w-full rounded-md px-1 -mx-1 text-left transition hover:bg-accent-light`}
      >
        {value || <span className="text-slate-400">{emptyLabel} (클릭해서 편집)</span>}
      </button>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: draft }),
      });
      if (res.ok) {
        setValue(draft);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const InputTag = multiline ? "textarea" : "input";

  return (
    <div className="flex flex-col gap-2">
      <InputTag
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-accent focus:outline-none"
        rows={multiline ? 3 : undefined}
      />
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-full bg-accent px-3 py-1 font-medium text-white disabled:opacity-50"
        >
          저장
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-full px-3 py-1 text-slate-500">
          취소
        </button>
      </div>
    </div>
  );
}
