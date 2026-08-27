import { NextRequest, NextResponse } from "next/server";
import { EDIT_COOKIE, isPasswordValid, tokenForPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password;

  if (!password || !isPasswordValid(password)) {
    return NextResponse.json({ ok: false, error: "비밀번호가 올바르지 않아요." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(EDIT_COOKIE, tokenForPassword(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(EDIT_COOKIE);
  return response;
}
