import { Guild } from "discord.js";

const MENTION_PATTERN = /<@!?(\d+)>/g;
const EVERYONE_PATTERN = /@everyone/;

/** "@채일 @밀라노" 처럼 사람 멘션이 섞인 문자열에서 중복 없이 유저 ID만 뽑아낸다. */
export function extractMentionedUserIds(input: string): string[] {
  const ids = new Set<string>();
  for (const match of input.matchAll(MENTION_PATTERN)) {
    ids.add(match[1]!);
  }
  return Array.from(ids);
}

export function hasEveryoneMention(input: string): boolean {
  return EVERYONE_PATTERN.test(input);
}

/**
 * 멘션 문자열을 유저 ID 목록으로 변환한다. "@everyone"이 포함되면 길드 멤버 전체(봇 제외)를 합친다.
 * @everyone 처리에는 GuildMembers 인텐트(및 Discord 개발자 포털의 Server Members Intent)가 필요하다.
 */
export async function resolveMentionedUserIds(guild: Guild | null, input: string): Promise<string[]> {
  const ids = new Set(extractMentionedUserIds(input));

  if (guild && hasEveryoneMention(input)) {
    const members = await guild.members.fetch();
    for (const member of members.values()) {
      if (!member.user.bot) ids.add(member.id);
    }
  }

  return Array.from(ids);
}
