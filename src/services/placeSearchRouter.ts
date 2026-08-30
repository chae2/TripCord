import { PlaceResult } from "./placeTypes";
import { searchPlaces as searchKakaoPlaces } from "./kakaoLocalClient";
import { searchNaverPlaces } from "./naverLocalClient";
import { searchYahooPlaces } from "./yahooLocalClient";
import { searchHotPepperPlaces } from "./hotPepperClient";
import { isJapanRegion } from "../utils/regionRouting";

export type RecommendCategory = "카페" | "맛집" | "놀거리" | "기념품";

export interface RoutedSearchResult {
  places: PlaceResult[];
  provider: string;
}

/**
 * 지역(일본 여부)과 카테고리에 따라 검색 provider를 고른다.
 * 일본: 맛집 → 핫페퍼 구르메, 그 외(카페/놀거리/기념품) → Yahoo 로컬서치
 * 그 외 지역(기본 한국): 카페/맛집 → 카카오, 놀거리/기념품 → 네이버
 */
export async function searchByCategory(
  category: RecommendCategory,
  region: string,
  keyword: string
): Promise<RoutedSearchResult> {
  const query = `${region} ${keyword}`.trim();
  const japan = isJapanRegion(region);

  if (japan) {
    if (category === "맛집") {
      return { places: await searchHotPepperPlaces(query), provider: "핫페퍼 구르메" };
    }
    return { places: await searchYahooPlaces(query), provider: "Yahoo 로컬서치" };
  }

  if (category === "카페" || category === "맛집") {
    return { places: await searchKakaoPlaces(query), provider: "카카오" };
  }
  return { places: await searchNaverPlaces(query), provider: "네이버" };
}
