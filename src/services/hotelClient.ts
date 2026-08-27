import { env } from "../config/env";
import { rapidApiGet } from "./rapidApiClient";

export interface HotelOption {
  name: string;
  price: string;
  rating: string;
  bookingUrl: string;
}

interface SearchDestinationResponse {
  data?: { dest_id?: string; search_type?: string; name?: string }[];
}

interface SearchHotelsResponse {
  data?: {
    hotels?: {
      property?: { name?: string; reviewScore?: number };
      priceBreakdown?: { grossPrice?: { value?: number; currency?: string } };
    }[];
  };
}

async function resolveDestination(query: string): Promise<{ destId: string; searchType: string } | null> {
  const res = await rapidApiGet<SearchDestinationResponse>(env.rapidApiHotelHost, "/api/v1/hotels/searchDestination", {
    query,
  });
  const first = res.data?.[0];
  if (!first?.dest_id) return null;
  return { destId: first.dest_id, searchType: first.search_type ?? "city" };
}

/**
 * RapidAPI의 "Booking.com" (booking-com15.p.rapidapi.com) 비공식 숙소 검색 엔드포인트를 사용한다.
 * 구독한 RapidAPI 상품에 따라 경로/응답 스키마가 다를 수 있어, 실패 시 여기부터 확인할 것.
 */
export async function searchHotels(params: {
  location: string;
  travelers: number;
  checkIn: string;
  checkOut: string;
  sortBy: "price" | "rating";
}): Promise<HotelOption[]> {
  const destination = await resolveDestination(params.location);
  if (!destination) {
    throw new Error(`"${params.location}" 에 대한 숙소 검색 결과를 찾지 못했어요.`);
  }

  const res = await rapidApiGet<SearchHotelsResponse>(env.rapidApiHotelHost, "/api/v1/hotels/searchHotels", {
    dest_id: destination.destId,
    search_type: destination.searchType,
    arrival_date: params.checkIn,
    departure_date: params.checkOut,
    adults: String(params.travelers),
    room_qty: "1",
    currency_code: "KRW",
    languagecode: "ko",
  });

  const hotels = res.data?.hotels ?? [];
  const withSortKeys = hotels.map((h) => {
    const priceValue = h.priceBreakdown?.grossPrice?.value;
    const rating = h.property?.reviewScore;
    return {
      option: {
        name: h.property?.name ?? "알 수 없음",
        price:
          priceValue !== undefined
            ? `${Math.round(priceValue).toLocaleString()}${h.priceBreakdown?.grossPrice?.currency ?? "KRW"}`
            : "가격 정보 없음",
        rating: rating !== undefined ? `${rating}` : "평점 없음",
        bookingUrl: `https://www.booking.com/searchresults.html?dest_id=${encodeURIComponent(destination.destId)}&dest_type=${destination.searchType}&checkin=${params.checkIn}&checkout=${params.checkOut}`,
      } satisfies HotelOption,
      priceValue: priceValue ?? Number.POSITIVE_INFINITY,
      rating: rating ?? Number.NEGATIVE_INFINITY,
    };
  });

  withSortKeys.sort((a, b) => (params.sortBy === "rating" ? b.rating - a.rating : a.priceValue - b.priceValue));

  return withSortKeys.slice(0, 5).map((h) => h.option);
}
