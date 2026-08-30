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

// 429 에러 방지를 위한 딜레이 함수
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 쿼리 문자열을 다듬어 점진적으로 재검색하는 Fallback 로직이 적용된 함수
 */
async function resolveDestinationWithFallback(query: string): Promise<{ destId: string; searchType: string; resolvedName: string } | null> {
    // 1. 방해가 되는 자연어 키워드 1차 제거
    let currentQuery = query.replace(/근처|주변|인근|일대/g, "").trim();
    const words = currentQuery.split(" ");

    while (words.length > 0) {
        currentQuery = words.join(" ");
        try {
            const res = await rapidApiGet<SearchDestinationResponse>(env.rapidApiHotelHost, "/api/v1/hotels/searchDestination", {
                query: currentQuery,
            });

            const first = res.data?.[0];
            if (first?.dest_id) {
                return {
                    destId: first.dest_id,
                    searchType: first.search_type ?? "city",
                    resolvedName: first.name ?? currentQuery
                };
            }
        } catch (error) {
            // 429 에러 발생 시 완전히 종료하지 않고, 루프를 멈추거나 로그만 남김
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[API] ${currentQuery} 검색 중 에러:`, message);
            if (message.includes("429")) throw error; // 429는 한도 초과이므로 바로 던짐
        }

        // 2. 검색에 실패했다면 마지막 단어를 하나 빼고 범위를 넓혀서 재검색
        words.pop();
        if (words.length > 0) {
            await delay(600); // 초당 요청 제한(Rate limit) 방지용 0.6초 대기
        }
    }

    return null;
}

export async function searchHotels(params: {
    location: string;
    travelers: number;
    checkIn: string;
    checkOut: string;
    sortBy: "price" | "rating" | "recommended"; // recommended: API가 준 순서(추천순) 그대로 사용
}): Promise<HotelOption[]> {
    const destination = await resolveDestinationWithFallback(params.location);

    if (!destination) {
        throw new Error(`"${params.location}" 및 주변 지역에 대한 숙소 검색 결과를 찾지 못했어요. 도시 이름으로 다시 검색해주세요.`);
    }

    // 재검색으로 인해 목적지가 바뀌었을 경우 안내 로그(선택사항)를 남기기 좋습니다.
    console.log(`요청: ${params.location} -> 실제 검색 목적지: ${destination.resolvedName}`);

    // 호텔 검색 전에도 429 방지를 위해 약간의 딜레이 추가
    await delay(600);

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

    if (params.sortBy === "rating") {
        withSortKeys.sort((a, b) => b.rating - a.rating);
    } else if (params.sortBy === "price") {
        withSortKeys.sort((a, b) => a.priceValue - b.priceValue);
    }
    // recommended: 정렬 없이 API가 준 순서(Booking.com 자체 추천순) 그대로 유지

    return withSortKeys.slice(0, 5).map((h) => h.option);
}