import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  discordToken: required("DISCORD_TOKEN"),
  discordClientId: required("DISCORD_CLIENT_ID"),
  discordDevGuildId: process.env.DISCORD_DEV_GUILD_ID || undefined,

  databaseUrl: required("DATABASE_URL"),

  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",
  supabasePhotoBucket: process.env.SUPABASE_PHOTO_BUCKET || "trip-photos",

  rapidApiKey: process.env.RAPIDAPI_KEY || "",
  rapidApiFlightHost: process.env.RAPIDAPI_FLIGHT_HOST || "flights-sky.p.rapidapi.com",
  rapidApiHotelHost: process.env.RAPIDAPI_HOTEL_HOST || "booking-com15.p.rapidapi.com",

  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || "",

  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY || "",
  naverClientId: process.env.NAVER_CLIENT_ID || "",
  naverClientSecret: process.env.NAVER_CLIENT_SECRET || "",
  yahooClientId: process.env.YAHOO_CLIENT_ID || "",
  hotPepperApiKey: process.env.HOTPEPPER_API_KEY || "",

  defaultNotifyChannelId: process.env.NOTIFY_CHANNEL_ID || undefined,
  timezone: process.env.TIMEZONE || "Asia/Seoul",
  webBaseUrl: process.env.WEB_BASE_URL || undefined,
};
