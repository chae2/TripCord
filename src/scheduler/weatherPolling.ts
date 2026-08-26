import { getTripsNeedingWeatherPoll, markWeatherPolled } from "../db/repositories/tripRepo";
import { saveSnapshots } from "../db/repositories/weatherRepo";
import { getHourlyForecast } from "../services/weatherClient";

export async function pollWeatherForUpcomingTrips(): Promise<void> {
  const now = new Date();
  const trips = await getTripsNeedingWeatherPoll(now);

  for (const trip of trips) {
    try {
      const hourly = await getHourlyForecast(trip.destination);
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const relevant = hourly.filter((h) => h.forecastFor <= in48h);

      if (relevant.length > 0) {
        await saveSnapshots(trip.id, relevant);
      }
      await markWeatherPolled(trip.id, now);
    } catch (err) {
      console.error(`[weatherPolling] trip ${trip.id} (${trip.destination}) 폴링 실패:`, err);
    }
  }
}
