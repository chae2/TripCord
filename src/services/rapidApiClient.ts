import { request } from "undici";
import { env } from "../config/env";

export class RapidApiError extends Error {}

export async function rapidApiGet<T>(host: string, path: string, query: Record<string, string>): Promise<T> {
  if (!env.rapidApiKey) {
    throw new RapidApiError("RAPIDAPI_KEY가 설정되어 있지 않아요.");
  }

  const url = new URL(`https://${host}${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const res = await request(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": env.rapidApiKey,
      "x-rapidapi-host": host,
    },
  });

  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new RapidApiError(`RapidAPI 요청 실패 (${res.statusCode}): ${body.slice(0, 200)}`);
  }

  return (await res.body.json()) as T;
}
