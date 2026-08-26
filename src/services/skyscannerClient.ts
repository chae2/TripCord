import { env } from "../config/env";
import { rapidApiGet } from "./rapidApiClient";

export interface FlightOption {
  airline: string;
  price: string;
  departTime: string;
  arriveTime: string;
  bookingUrl: string;
}

interface AutoCompleteResponse {
  data?: { presentation?: { suggestionTitle?: string }; navigation?: { relevantFlightParams?: { skyId?: string; entityId?: string } } }[];
}

interface SearchFlightsResponse {
  data?: {
    itineraries?: {
      price?: { formatted?: string };
      legs?: { carriers?: { marketing?: { name?: string }[] }; departure?: string; arrival?: string }[];
    }[];
  };
}

async function resolveSkyId(query: string): Promise<{ skyId: string; entityId: string } | null> {
  const res = await rapidApiGet<AutoCompleteResponse>(env.rapidApiFlightHost, "/flights/auto-complete", {
    query,
  });
  const first = res.data?.[0]?.navigation?.relevantFlightParams;
  if (!first?.skyId || !first.entityId) return null;
  return { skyId: first.skyId, entityId: first.entityId };
}

/**
 * RapidAPI의 비공식 Skyscanner 엔드포인트(sky-scanner3 계열)를 사용한다.
 * 구독한 RapidAPI 상품에 따라 경로/응답 스키마가 다를 수 있어, 실패 시 여기부터 확인할 것.
 */
export async function searchFlights(params: {
  location: string;
  travelers: number;
  departDate: string;
  returnDate: string;
}): Promise<FlightOption[]> {
  const destination = await resolveSkyId(params.location);
  if (!destination) {
    throw new Error(`"${params.location}" 에 대한 항공권 검색 결과를 찾지 못했어요.`);
  }

  const res = await rapidApiGet<SearchFlightsResponse>(env.rapidApiFlightHost, "/flights/search-roundtrip", {
    fromEntityId: "SEOL", // 서울 출발 고정, 필요 시 옵션화
    toEntityId: destination.entityId,
    departDate: params.departDate,
    returnDate: params.returnDate,
    adults: String(params.travelers),
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
