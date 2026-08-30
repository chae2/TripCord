const JAPAN_KEYWORDS = [
  "도쿄",
  "오사카",
  "교토",
  "삿포로",
  "후쿠오카",
  "나고야",
  "요코하마",
  "고베",
  "히로시마",
  "오키나와",
  "나라",
  "센다이",
  "하코다테",
  "tokyo",
  "osaka",
  "kyoto",
  "sapporo",
  "fukuoka",
  "nagoya",
  "yokohama",
  "kobe",
  "hiroshima",
  "okinawa",
  "nara",
  "sendai",
  "hakodate",
  "japan",
  "일본",
];

/** 여행지/지역 문자열이 일본 지역을 가리키는지 간단한 키워드 매칭으로 판별한다. 목록에 없으면 기본(한국) 취급. */
export function isJapanRegion(text: string): boolean {
  const lower = text.toLowerCase();
  return JAPAN_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}
