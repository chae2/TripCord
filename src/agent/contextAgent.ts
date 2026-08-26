export interface Suggestion {
  command: string;
  reason: string;
}

interface Rule {
  command: string;
  reason: string;
  patterns: RegExp[];
}

// LLM을 호출하지 않는 무료 규칙 기반 분류기. 오탐을 줄이기 위해 패턴을 다소 보수적으로 잡는다.
const rules: Rule[] = [
  {
    command: "/예약",
    reason: "숙소나 항공권 이야기가 보여요",
    patterns: [/(숙소|호텔|항공권|비행기표|스카이스캐너|아고다|agoda|skyscanner)/i],
  },
  {
    command: "/스케줄",
    reason: "일정 얘기가 보여요",
    patterns: [/\d+\s*일차/, /(일정|스케줄).{0,10}(짜|정하|갈까|가자|넣)/],
  },
  {
    command: "/정산",
    reason: "정산/비용 이야기가 보여요",
    patterns: [/(\d{3,}\s*원|정산|더치페이|나눠\s*내|1\/n|엔빵)/],
  },
  {
    command: "/준비",
    reason: "준비물 이야기가 보여요",
    patterns: [/(뭐\s*챙기|준비물|짐\s*싸)/],
  },
  {
    command: "/여행등록",
    reason: "새 여행지 얘기가 보여요",
    patterns: [/(어디로\s*갈까|여행지\s*정하|이번\s*여행)/],
  },
];

/** 메시지 하나당 가장 먼저 매칭되는 규칙 1개만 제안한다 (과도한 알림 방지). */
export function detectSuggestion(content: string): Suggestion | null {
  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(content))) {
      return { command: rule.command, reason: rule.reason };
    }
  }
  return null;
}
