import { env } from "../config/env";
import { rapidApiGet } from "./rapidApiClient";

export interface FlightOption {
  airline: string;
  price: string;
  priceRaw: number;
  departTime: string;
  arriveTime: string;
  bookingUrl: string;
}

interface SearchAirportResponse {
  data?: {
    presentation?: { id?: string; title?: string; suggestionTitle?: string };
    navigation?: { relevantFlightParams?: { skyId?: string; entityId?: string; localizedName?: string } };
  }[];
}

interface SearchFlightsResponse {
  data?: {
    itineraries?: {
      price?: { formatted?: string; raw?: number };
      legs?: { carriers?: { marketing?: { name?: string }[] }; departure?: string; arrival?: string }[];
    }[];
  };
  errors?: unknown;
  status?: boolean;
}

interface ResolvedPlace {
  entityIdParam: string; // fromEntityId/toEntityId에 넣을 base64 place id
  skyId: string;
}

// 지명 끝의 "도/시/군" 같은 행정구역 접미사를 떼고 비교한다 ("제주도" vs "제주공항"의 "제주"를 매칭시키기 위함).
function normalizeForMatch(text: string): string {
  return text.replace(/(특별자치도|특별자치시|광역시|특별시|자치시|[도시군])$/u, "").trim();
}

/** 질의어와 후보 이름의 관련도를 점수화한다. 높을수록 더 정확한 매칭. */
function scoreCandidate(query: string, title: string): number {
  const q = normalizeForMatch(query);
  const t = normalizeForMatch(title);
  if (!q || !t) return 0;
  if (t === q) return 4;
  if (t.startsWith(q) || q.startsWith(t)) return 3;
  if (t.includes(q) || q.includes(t)) return 2;
  return 0;
}

// flights-sky(RapidAPI, ntd119) 사용. Sky Scrapper(apiheya)와 별도 구독/할당량이라 한쪽이 한도를 넘어도
// 서로 영향이 없다. 한글 질의도 지원해서 별도 지명 번역이 필요 없다(실제 호출로 확인함).
// 단, 응답이 관련도 순이 아닐 수 있어(예: "제주도" 검색 시 "제다(사우디)"가 1순위로 오는 경우가 있었음)
// data[0]을 그대로 믿지 않고 후보들 중 질의어와 가장 잘 맞는 것을 직접 골라야 한다.
async function resolvePlace(query: string): Promise<ResolvedPlace | null> {
  const res = await rapidApiGet<SearchAirportResponse>(env.rapidApiFlightHost, "/flights/auto-complete", {
    query,
  });
  const candidates = res.data ?? [];
  if (candidates.length === 0) return null;

  let best = candidates[0]!;
  let bestScore = -1;
  for (const candidate of candidates) {
    const title = candidate.presentation?.title ?? candidate.navigation?.relevantFlightParams?.localizedName ?? "";
    const score = scoreCandidate(query, title);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const id = best.presentation?.id;
  const skyId = best.navigation?.relevantFlightParams?.skyId;
  if (!id || !skyId) return null;
  return { entityIdParam: id, skyId };
}

const SEOUL_QUERY = "서울";

export async function searchFlights(params: {
  origin?: string; // 미지정 시 서울
  location: string;
  travelers: number;
  departDate: string;
  returnDate?: string; // 미지정 시 편도 검색
}): Promise<FlightOption[]> {
  const [origin, destination] = await Promise.all([
    resolvePlace(params.origin ?? SEOUL_QUERY),
    resolvePlace(params.location),
  ]);

  if (!origin) {
    throw new Error(`"${params.origin ?? "서울"}" 출발지를 찾지 못했어요. 다른 도시명으로 다시 시도해주세요.`);
  }
  if (!destination) {
    throw new Error(`"${params.location}" 에 대한 항공권 검색 결과를 찾지 못했어요. 공항이 있는 주요 도시명으로 검색해주세요.`);
  }

  const endpoint = params.returnDate ? "/flights/search-roundtrip" : "/flights/search-one-way";
  const res = await rapidApiGet<SearchFlightsResponse>(env.rapidApiFlightHost, endpoint, {
    fromEntityId: origin.entityIdParam,
    toEntityId: destination.entityIdParam,
    departDate: params.departDate,
    ...(params.returnDate ? { returnDate: params.returnDate } : {}),
    adults: String(params.travelers),
    cabinClass: "economy",
    currency: "KRW",
    market: "KR",
    locale: "ko-KR",
  });

  const bookingPath = params.returnDate
    ? `${params.departDate.replace(/-/g, "")}/${params.returnDate.replace(/-/g, "")}`
    : `${params.departDate.replace(/-/g, "")}`;

  const itineraries = res.data?.itineraries ?? [];

  // 우선순위 옵션 없이 항상 최저가 순으로 정렬해 상위 5개만 보여준다.
  const sorted = [...itineraries].sort((a, b) => (a.price?.raw ?? Infinity) - (b.price?.raw ?? Infinity));

  return sorted.slice(0, 5).map((it) => {
    const leg = it.legs?.[0];
    return {
      airline: leg?.carriers?.marketing?.[0]?.name ?? "알 수 없음",
      price: it.price?.formatted ?? "가격 정보 없음",
      priceRaw: it.price?.raw ?? Number.POSITIVE_INFINITY,
      departTime: leg?.departure ?? "-",
      arriveTime: leg?.arrival ?? "-",
      bookingUrl: `https://www.skyscanner.co.kr/transport/flights/${origin.skyId.toLowerCase()}/${destination.skyId.toLowerCase()}/${bookingPath}/`,
    };
  });
}
