import { env } from "../config/env";
import { rapidApiGet } from "./rapidApiClient";

export interface FlightOption {
  airline: string;
  price: string;
  departTime: string;
  arriveTime: string;
  bookingUrl: string;
}

interface SearchAirportResponse {
  data?: { skyId?: string; entityId?: string; presentation?: { title?: string } }[];
}

interface SearchFlightsResponse {
  data?: {
    itineraries?: {
      price?: { formatted?: string };
      legs?: { carriers?: { marketing?: { name?: string }[] }; departure?: string; arrival?: string }[];
    }[];
  };
}

async function resolvePlace(query: string): Promise<{ skyId: string; entityId: string } | null> {
    const res = await rapidApiGet<SearchAirportResponse>(env.rapidApiFlightHost, "/api/v1/flights/searchAirport", {
        query,
        locale: "ko-KR",
    });
    const first = res.data?.[0];
    if (!first?.skyId || !first.entityId) return null;
    return { skyId: first.skyId, entityId: first.entityId };
}

// 🚀 최적화: 출발지가 고정(서울)이라면 매번 API를 호출하지 않고 ID를 하드코딩(캐싱)해 둡니다.
// 이로 인해 항공권 검색당 API 호출이 3회 -> 2회로 줄고, 동시 호출(429)이 방지됩니다.
const SEOUL_PLACE = {
    skyId: "SEL",
    entityId: "27537542" // Skyscanner의 서울 entityId
};

export async function searchFlights(params: {
    location: string;
    travelers: number;
    departDate: string;
    returnDate: string;
}): Promise<FlightOption[]> {

    // 출발지는 미리 정의된 상수 사용, 목적지만 API로 조회
    const origin = SEOUL_PLACE;
    const destination = await resolvePlace(params.location);

    if (!destination) {
        throw new Error(`"${params.location}" 에 대한 항공권 검색 결과를 찾지 못했어요. 공항이 있는 주요 도시명으로 검색해주세요.`);
    }

    // Rate Limit(429) 방지를 위해 0.6초 대기 후 본 검색 진행
    await new Promise(r => setTimeout(r, 600));

    const res = await rapidApiGet<SearchFlightsResponse>(env.rapidApiFlightHost, "/api/v1/flights/searchFlights", {
        originSkyId: origin.skyId,
        originEntityId: origin.entityId,
        destinationSkyId: destination.skyId,
        destinationEntityId: destination.entityId,
        date: params.departDate,
        returnDate: params.returnDate,
        adults: String(params.travelers),
        currency: "KRW",
        market: "KR",
        countryCode: "KR",
    });

    const itineraries = res.data?.itineraries ?? [];
    return itineraries.slice(0, 5).map((it) => {
        const leg = it.legs?.[0];
        return {
            airline: leg?.carriers?.marketing?.[0]?.name ?? "알 수 없음",
            price: it.price?.formatted ?? "가격 정보 없음",
            departTime: leg?.departure ?? "-",
            arriveTime: leg?.arrival ?? "-",
            bookingUrl: `https://www.skyscanner.co.kr/transport/flights/seol/${destination.skyId.toLowerCase()}/${params.departDate.replace(/-/g, "")}/${params.returnDate.replace(/-/g, "")}/`,
        };
    });
}
