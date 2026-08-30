/**
 * 위치 입력이 링크면 지명을 최대한 추출하고, 아니면 원문 그대로 반환한다.
 * 구글 지도의 "/maps/place/지명/" 패턴 정도만 지원하는 best-effort 파싱이다 — 완벽한 링크 해석은 범위 밖.
 */
export function resolveLocationText(input: string): string {
  if (!/^https?:\/\//i.test(input)) return input;

  try {
    const url = new URL(input);
    const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);
    if (placeMatch?.[1]) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }
  } catch {
    // 파싱 실패 시 원문 유지
  }

  return input;
}
