/** 여행 시작일 기준 1일차부터 시작하는 dayNumber 계산. 시작 전이면 0 이하가 나올 수 있음. */
export function dayNumberFor(startDate: Date, when: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(when);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

export function parseDateInput(input: string): Date {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`INVALID_DATE:${input}`);
  }
  return date;
}
