import { env } from "../config/env";
import { rapidApiGet } from "./rapidApiClient";

export interface HotelOption {
  name: string;
  price: string;
  rating: string;
  bookingUrl: string;
}

interface AutoCompleteResponse {
  data?: { id?: string; name?: string; type?: string }[];
}

interface SearchHotelsResponse {
  data?: { hotels?: { name?: string; price?: { formatted?: string }; rating?: number; hotelId?: string }[] };
}

async function resolveCityId(query: string): Promise<string | null> {
  const res = await rapidApiGet<AutoCompleteResponse>(env.rapidApiHotelHost, "/locations/search", { query });
  const first = res.data?.find((d) => d.type === "city") ?? res.data?.[0];
  return first?.id ?? null;
}

/**
 * RapidAPI의 비공식 Agoda 계열 엔드포인트를 사용한다. Provider를 교체하려면 이 파일만 갈아끼우면 된다.
 */
export async function searchHotels(params: {
  location: string;
  travelers: number;
  checkIn: string;
  checkOut: string;
  sortBy: "price" | "rating";
}): Promise<HotelOption[]> {
  const cityId = await resolveCityId(params.location);
  if (!cityId) {
    throw new Error(`"${params.location}" 에 대한 숙소 검색 결과를 찾지 못했어요.`);
  }

  const res = await rapidApiGet<SearchHotelsResponse>(env.rapidApiHotelHost, "/hotels/search", {
    cityId,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: String(params.travelers),
    sortBy: params.sortBy,
  });

  const hotels = res.data?.hotels ?? [];
  return hotels.slice(0, 5).map((h) => ({
    name: h.name ?? "알 수 없음",
    price: h.price?.formatted ?? "가격 정보 없음",
    rating: h.rating !== undefined ? `${h.rating}` : "평점 없음",
    bookingUrl: `https://www.agoda.com/search?city=${encodeURIComponent(cityId)}&checkIn=${params.checkIn}&checkOut=${params.checkOut}`,
  }));
}
