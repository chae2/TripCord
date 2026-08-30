import { request } from "undici";
import { env } from "../config/env";
import { PlaceResult } from "./placeTypes";

export type { PlaceResult };

interface KeywordSearchResponse {
  documents?: {
    place_name?: string;
    category_group_name?: string;
    category_name?: string;
    road_address_name?: string;
    address_name?: string;
    place_url?: string;
  }[];
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!env.kakaoRestApiKey) {
    throw new Error("KAKAO_REST_API_KEY가 설정되어 있지 않아요.");
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "5");

  const res = await request(url, {
    headers: { Authorization: `KakaoAK ${env.kakaoRestApiKey}` },
  });

  if (res.statusCode === 403) {
    const body = await res.body.text();
    if (body.includes("OPEN_MAP_AND_LOCAL")) {
      throw new Error(
        "카카오 개발자 콘솔에서 이 앱의 [제품 설정 > 카카오맵] 사용 설정이 꺼져 있어요. ON으로 바꾼 뒤 다시 시도해주세요 (그래도 안 되면 신규 앱 검수가 필요할 수 있어요)."
      );
    }
    throw new Error(`카카오 로컬 API 요청 실패 (403): ${body.slice(0, 200)}`);
  }

  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`카카오 로컬 API 요청 실패 (${res.statusCode}): ${body.slice(0, 200)}`);
  }

  const body = (await res.body.json()) as KeywordSearchResponse;

  return (body.documents ?? []).map((d) => ({
    name: d.place_name ?? "이름 없음",
    category: d.category_group_name || d.category_name || "카테고리 없음",
    address: d.road_address_name || d.address_name || "주소 없음",
    url: d.place_url ?? "",
  }));
}
