import { createHash } from "crypto";
import { cookies } from "next/headers";

export const EDIT_COOKIE = "tc_edit";

function expectedToken(): string | null {
  const password = process.env.EDIT_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export function tokenForPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function isPasswordValid(password: string): boolean {
  const expected = expectedToken();
  return expected !== null && tokenForPassword(password) === expected;
}

export function isEditRequestAuthorized(cookieValue: string | undefined): boolean {
  const expected = expectedToken();
  return expected !== null && cookieValue === expected;
}

/** 서버 컴포넌트에서 현재 요청이 편집 권한을 가졌는지 확인한다. */
export function canEditFromCookies(): boolean {
  const value = cookies().get(EDIT_COOKIE)?.value;
  return isEditRequestAuthorized(value);
}
