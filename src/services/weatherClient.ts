import { request } from "undici";
import { env } from "../config/env";

export interface HourlyForecast {
  forecastFor: Date;
  tempC: number;
  condition: string;
}

interface GeocodeResponse {
  lat: number;
  lon: number;
  name: string;
}

interface OneCallResponse {
  hourly?: { dt: number; temp: number; weather?: { description?: string }[] }[];
}

async function geocode(location: string): Promise<GeocodeResponse | null> {
  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", location);
  url.searchParams.set("limit", "1");
  url.searchParams.set("appid", env.openWeatherApiKey);

  const res = await request(url);
  const body = (await res.body.json()) as GeocodeResponse[];
  return body[0] ?? null;
}

export async function getHourlyForecast(location: string): Promise<HourlyForecast[]> {
  if (!env.openWeatherApiKey) {
    throw new Error("OPENWEATHER_API_KEY가 설정되어 있지 않아요.");
  }

  const place = await geocode(location);
  if (!place) {
    throw new Error(`"${location}" 의 위치 정보를 찾지 못했어요.`);
  }

  const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
  url.searchParams.set("lat", String(place.lat));
  url.searchParams.set("lon", String(place.lon));
  url.searchParams.set("units", "metric");
  url.searchParams.set("exclude", "current,minutely,daily,alerts");
  url.searchParams.set("appid", env.openWeatherApiKey);

  const res = await request(url);
  const body = (await res.body.json()) as OneCallResponse;

  return (body.hourly ?? []).map((h) => ({
    forecastFor: new Date(h.dt * 1000),
    tempC: h.temp,
    condition: h.weather?.[0]?.description ?? "정보 없음",
  }));
}
