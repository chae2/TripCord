import { request } from "undici";
import { env } from "../config/env";
import { PlaceResult } from "./placeTypes";

interface NaverLocalResponse {
  items?: { title?: string; category?: string; address?: string; roadAddress?: string; link?: string }[];
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/** 네이버 검색 API(지역) - 놀거리/기념품 카테고리에 사용 */
export async function searchNaverPlaces(query: string): Promise<PlaceResult[]> {
  if (!env.naverClientId || !env.naverClientSecret) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 설정되어 있지 않아요.");
  }

    // 1. NCP NAVER API HUB 전용 URL로 변경
    const url = new URL("https://naverapihub.apigw.ntruss.com/search/v1/local");
    url.searchParams.set("query", query);
    url.searchParams.set("display", "5");
    // NCP API는 포맷 파라미터를 추가로 요구할 수 있어 format=json을 명시하는 것도 좋습니다.
    url.searchParams.set("format", "json");

    const res = await request(url, {
        headers: {
            // 2. NCP 전용 인증 헤더 키로 변경
            "X-NCP-APIGW-API-KEY-ID": env.naverClientId,
            "X-NCP-APIGW-API-KEY": env.naverClientSecret,
        },
    });

  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`네이버 지역검색 API 요청 실패 (${res.statusCode}): ${body.slice(0, 200)}`);
  }

  const body = (await res.body.json()) as NaverLocalResponse;

  return (body.items ?? []).map((item) => ({
    name: stripHtmlTags(item.title ?? "이름 없음"),
    category: item.category || "카테고리 없음",
    address: item.roadAddress || item.address || "주소 없음",
    url: item.link ?? "",
  }));
}
