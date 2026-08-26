/**
 * amount를 참여자 수만큼 정수로 N분의 1 분배한다.
 * 나머지(divmod)는 앞쪽 참여자부터 1원씩 더 부담해 총합이 amount와 정확히 일치하도록 한다.
 */
export function splitEvenly(amount: number, participantIds: string[]): Map<string, number> {
  if (participantIds.length === 0) {
    throw new Error("participantIds must not be empty");
  }

  const base = Math.floor(amount / participantIds.length);
  const remainder = amount - base * participantIds.length;

  const shares = new Map<string, number>();
  participantIds.forEach((id, index) => {
    shares.set(id, base + (index < remainder ? 1 : 0));
  });

  return shares;
}
