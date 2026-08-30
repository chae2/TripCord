const MENTION_PATTERN = /<@!?(\d+)>/g;

/** "@채일 @밀라노" 처럼 사람 멘션이 섞인 문자열에서 중복 없이 유저 ID만 뽑아낸다. */
export function extractMentionedUserIds(input: string): string[] {
  const ids = new Set<string>();
  for (const match of input.matchAll(MENTION_PATTERN)) {
    ids.add(match[1]!);
  }
  return Array.from(ids);
}
