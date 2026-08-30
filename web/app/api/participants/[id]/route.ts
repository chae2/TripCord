import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { EDIT_COOKIE, isEditRequestAuthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EDITABLE_FIELDS = ["introName", "nickname", "likes", "dislikes", "quirks", "extra"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieValue = request.cookies.get(EDIT_COOKIE)?.value;
  if (!isEditRequestAuthorized(cookieValue)) {
    return NextResponse.json({ ok: false, error: "편집 권한이 없어요." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<Record<EditableField, string>> | null;
  const field = body && (Object.keys(body).find((k) => EDITABLE_FIELDS.includes(k as EditableField)) as EditableField | undefined);

  if (!field || typeof body![field] !== "string") {
    return NextResponse.json({ ok: false, error: "수정할 필드 값이 필요해요." }, { status: 400 });
  }

  await prisma.participant.update({ where: { id: params.id }, data: { [field]: body![field] } });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
