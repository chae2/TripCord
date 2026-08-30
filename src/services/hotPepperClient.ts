import { request } from "undici";
import { env } from "../config/env";
import { PlaceResult } from "./placeTypes";

interface HotPepperResponse {
  results?: {
    shop?: { name?: string; address?: string; genre?: { name?: string }; urls?: { pc?: string } }[];
  };
}

/** 핫페퍼 구르메API - 일본 지역의 맛집/점메추/저메추 검색에 사용 */
export async function searchHotPepperPlaces(query: string): Promise<PlaceResult[]> {
  if (!env.hotPepperApiKey) {
    throw new Error("HOTPEPPER_API_KEY가 설정되어 있지 않아요.");
  }

  const url = new URL("https://webservice.recruit.co.jp/hotpepper/gourmet/v1/");
  url.searchParams.set("key", env.hotPepperApiKey);
  url.searchParams.set("keyword", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("format", "json");

  const res = await request(url);

  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`핫페퍼 구르메 API 요청 실패 (${res.statusCode}): ${body.slice(0, 200)}`);
  }

  const body = (await res.body.json()) as HotPepperResponse;

  return (body.results?.shop ?? []).map((shop) => ({
    name: shop.name ?? "이름 없음",
    category: shop.genre?.name || "카테고리 없음",
    address: shop.address || "주소 없음",
    url: shop.urls?.pc ?? "",
  }));
}
