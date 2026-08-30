import { request } from "undici";
import { env } from "../config/env";
import { PlaceResult } from "./placeTypes";

interface YahooLocalResponse {
  Feature?: { Name?: string; Property?: { Address?: string; Genre?: { Name?: string }[] } }[];
}

/** Yahoo!로컬서치API(YOLP) - 일본 지역의 카페/놀거리/기념품 검색에 사용 */
export async function searchYahooPlaces(query: string): Promise<PlaceResult[]> {
  if (!env.yahooClientId) {
    throw new Error("YAHOO_CLIENT_ID가 설정되어 있지 않아요.");
  }

  const url = new URL("https://map.yahooapis.jp/search/local/V1/localSearch");
  url.searchParams.set("appid", env.yahooClientId);
  url.searchParams.set("query", query);
  url.searchParams.set("results", "5");
  url.searchParams.set("output", "json");

  const res = await request(url);

  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`Yahoo 로컬서치 API 요청 실패 (${res.statusCode}): ${body.slice(0, 200)}`);
  }

  const body = (await res.body.json()) as YahooLocalResponse;

  return (body.Feature ?? []).map((f) => ({
    name: f.Name ?? "이름 없음",
    category: f.Property?.Genre?.[0]?.Name || "카테고리 없음",
    address: f.Property?.Address || "주소 없음",
    url: "",
  }));
}
