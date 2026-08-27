import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { searchFlights } from "../services/skyscannerClient";
import { searchHotels } from "../services/hotelClient";
import { baseEmbed, errorEmbed } from "../utils/embeds";
import { parseDateInput } from "../utils/dateHelpers";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange(): { departDate: string; returnDate: string } {
  const depart = new Date();
  depart.setDate(depart.getDate() + 14);
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + 3);
  return { departDate: toIsoDate(depart), returnDate: toIsoDate(ret) };
}

function resolveSortBy(priority: string): "price" | "rating" {
  if (priority.includes("평점") || priority.includes("등급") || priority.includes("품질")) return "rating";
  return "price";
}

const searchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("예약")
    .setDescription("Skyscanner/Agoda에서 항공권과 숙소를 검색합니다")
    .addStringOption((opt) => opt.setName("위치").setDescription("여행지 (예: 오사카)").setRequired(true))
    .addStringOption((opt) =>
      opt.setName("우선순위").setDescription("가격/평점 등 무엇을 우선할지").setRequired(true)
    )
    .addIntegerOption((opt) => opt.setName("명수").setDescription("인원 수").setRequired(true).setMinValue(1))
    .addStringOption((opt) => opt.setName("출발일").setDescription("YYYY-MM-DD (기본: 2주 후)").setRequired(false))
    .addStringOption((opt) => opt.setName("복귀일").setDescription("YYYY-MM-DD (기본: 출발일+3일)").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const location = interaction.options.getString("위치", true);
    const priority = interaction.options.getString("우선순위", true);
    const travelers = interaction.options.getInteger("명수", true);
    const departDateInput = interaction.options.getString("출발일");
    const returnDateInput = interaction.options.getString("복귀일");

    let departDate: string;
    let returnDate: string;
    try {
      if (departDateInput && returnDateInput) {
        departDate = toIsoDate(parseDateInput(departDateInput));
        returnDate = toIsoDate(parseDateInput(returnDateInput));
      } else {
        const defaults = defaultDateRange();
        departDate = defaults.departDate;
        returnDate = defaults.returnDate;
      }
    } catch {
      await interaction.reply({ embeds: [errorEmbed("날짜 형식이 올바르지 않아요. 예: 2026-09-01")], flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();

    const sortBy = resolveSortBy(priority);

    const [flightsResult, hotelsResult] = await Promise.allSettled([
      searchFlights({ location, travelers, departDate, returnDate }),
      searchHotels({ location, travelers, checkIn: departDate, checkOut: returnDate, sortBy }),
    ]);

    const embeds = [];

    const flightEmbed = baseEmbed(`✈️ ${location} 항공권 (${departDate} ~ ${returnDate})`);
    if (flightsResult.status === "fulfilled" && flightsResult.value.length > 0) {
      flightEmbed.setDescription(
        flightsResult.value
          .map((f) => `**${f.airline}** ${f.price}\n${f.departTime} → ${f.arriveTime}\n${f.bookingUrl}`)
          .join("\n\n")
      );
    } else {
      flightEmbed.setDescription(
        flightsResult.status === "rejected" ? `검색 실패: ${(flightsResult.reason as Error).message}` : "검색 결과가 없어요."
      );
    }
    embeds.push(flightEmbed);

    const hotelEmbed = baseEmbed(`🏨 ${location} 숙소 (${travelers}명, 우선순위: ${priority})`);
    if (hotelsResult.status === "fulfilled" && hotelsResult.value.length > 0) {
      hotelEmbed.setDescription(
        hotelsResult.value.map((h) => `**${h.name}** ${h.price} (평점 ${h.rating})\n${h.bookingUrl}`).join("\n\n")
      );
    } else {
      hotelEmbed.setDescription(
        hotelsResult.status === "rejected" ? `검색 실패: ${(hotelsResult.reason as Error).message}` : "검색 결과가 없어요."
      );
    }
    embeds.push(hotelEmbed);

    await interaction.editReply({ embeds });
  },
};

export const commands: Command[] = [searchCommand];
