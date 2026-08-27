import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { EDIT_COOKIE, isEditRequestAuthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieValue = request.cookies.get(EDIT_COOKIE)?.value;
  if (!isEditRequestAuthorized(cookieValue)) {
    return NextResponse.json({ ok: false, error: "편집 권한이 없어요." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { locationTag?: string } | null;
  if (typeof body?.locationTag !== "string") {
    return NextResponse.json({ ok: false, error: "locationTag 값이 필요해요." }, { status: 400 });
  }

  await prisma.photo.update({ where: { id: params.id }, data: { locationTag: body.locationTag } });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
