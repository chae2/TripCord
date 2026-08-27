"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditModeToggle({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (canEdit) {
    return (
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth", { method: "DELETE" });
          router.refresh();
        }}
        className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:border-slate-300"
      >
        편집 종료
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-dark"
      >
        수정
      </button>
    );
  }

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("비밀번호가 올바르지 않아요.");
        return;
      }
      setOpen(false);
      setPassword("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="편집 비밀번호"
        className="w-32 rounded-full border border-slate-200 px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        확인
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
