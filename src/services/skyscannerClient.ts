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

const ORIGIN_QUERY = "서울";

/**
 * RapidAPI의 "Sky Scrapper"(sky-scrapper.p.rapidapi.com) 비공식 Skyscanner 엔드포인트를 사용한다.
 * 구독한 RapidAPI 상품에 따라 경로/응답 스키마가 다를 수 있어, 실패 시 여기부터 확인할 것.
 */
export async function searchFlights(params: {
  location: string;
  travelers: number;
  departDate: string;
  returnDate: string;
}): Promise<FlightOption[]> {
  const [origin, destination] = await Promise.all([resolvePlace(ORIGIN_QUERY), resolvePlace(params.location)]);

  if (!origin) {
    throw new Error("출발지(서울)에 대한 공항 정보를 찾지 못했어요.");
  }
  if (!destination) {
    throw new Error(`"${params.location}" 에 대한 항공권 검색 결과를 찾지 못했어요.`);
  }

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
