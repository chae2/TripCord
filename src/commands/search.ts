import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { searchFlights } from "../services/skyscannerClient";
import { searchHotels } from "../services/hotelClient";
import { getActiveTrip } from "../db/repositories/tripRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";
import { parseDateInput } from "../utils/dateHelpers";
import { resolveLocationText } from "../utils/locationParsing";

type HotelSortBy = "price" | "rating" | "recommended";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function defaultDateRange(guildId: string | null): Promise<{ departDate: string; returnDate: string }> {
  if (guildId) {
    const trip = await getActiveTrip(guildId);
    if (trip) {
      return { departDate: toIsoDate(trip.startDate), returnDate: toIsoDate(trip.endDate) };
    }
  }

  const depart = new Date();
  depart.setDate(depart.getDate() + 14);
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + 3);
  return { departDate: toIsoDate(depart), returnDate: toIsoDate(ret) };
}

const searchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("예약")
    .setDescription("항공권 또는 숙소를 검색합니다")
    .addStringOption((opt) =>
      opt
        .setName("종류")
        .setDescription("무엇을 검색할지")
        .setRequired(true)
        .addChoices({ name: "비행기", value: "비행기" }, { name: "숙소", value: "숙소" })
    )
    .addStringOption((opt) => opt.setName("위치").setDescription("여행지 (텍스트 또는 링크, 비행기는 영문 도시명 권장)").setRequired(true))
    .addIntegerOption((opt) => opt.setName("명수").setDescription("인원 수").setRequired(true).setMinValue(1))
    .addStringOption((opt) =>
      opt
        .setName("비행방식")
        .setDescription("비행기 검색 시: 왕복(기본)|편도")
        .setRequired(false)
        .addChoices({ name: "왕복", value: "왕복" }, { name: "편도", value: "편도" })
    )
    .addStringOption((opt) =>
      opt.setName("출발지").setDescription("비행기 검색 시 출발 도시 (기본: 서울, 영문 권장)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("우선순위")
        .setDescription("숙소 검색 시 정렬 기준 (기본: 가격). 비행기는 항상 최저가로 가져와요")
        .setRequired(false)
        .addChoices({ name: "가격", value: "price" }, { name: "평점", value: "rating" }, { name: "추천순", value: "recommended" })
    )
    .addStringOption((opt) =>
      opt.setName("출발일").setDescription("YYYY-MM-DD (기본: 등록된 여행 시작일, 없으면 2주 후)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("복귀일").setDescription("YYYY-MM-DD (기본: 등록된 여행 종료일, 편도면 불필요)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const kind = interaction.options.getString("종류", true) as "비행기" | "숙소";
    const location = resolveLocationText(interaction.options.getString("위치", true));
    const travelers = interaction.options.getInteger("명수", true);
    const tripType = interaction.options.getString("비행방식") ?? "왕복";
    const origin = interaction.options.getString("출발지") ?? undefined;
    const sortBy = (interaction.options.getString("우선순위") as HotelSortBy | null) ?? "price";
    const departDateInput = interaction.options.getString("출발일");
    const returnDateInput = interaction.options.getString("복귀일");

    // 날짜 형식 검증처럼 동기적으로 끝나는 작업이 아니면(특히 활성 여행 조회 같은 DB 접근)
    // 3초 응답 제한을 넘길 수 있으므로, 그런 작업 전에 먼저 defer한다.
    if (departDateInput) {
      try {
        parseDateInput(departDateInput);
        if (returnDateInput) parseDateInput(returnDateInput);
      } catch {
        await interaction.reply({ embeds: [errorEmbed("날짜 형식이 올바르지 않아요. 예: 2026-09-01")], flags: MessageFlags.Ephemeral });
        return;
      }
    }

    await interaction.deferReply();

    let departDate: string;
    let returnDate: string | undefined;
    if (departDateInput) {
      departDate = toIsoDate(parseDateInput(departDateInput));
      returnDate = returnDateInput ? toIsoDate(parseDateInput(returnDateInput)) : undefined;
    } else {
      const defaults = await defaultDateRange(interaction.guildId);
      departDate = defaults.departDate;
      returnDate = defaults.returnDate;
    }

    if (kind === "비행기" && tripType === "편도") {
      returnDate = undefined;
    }

    if (kind === "비행기") {
      try {
        const flights = await searchFlights({ origin, location, travelers, departDate, returnDate });
        const embed = baseEmbed(
          `✈️ ${origin ?? "서울"} → ${location} 항공권 (${departDate}${returnDate ? ` ~ ${returnDate}` : " · 편도"}, 최저가순)`
        );
        embed.setDescription(
          flights.length > 0
            ? flights.map((f) => `**${f.airline}** ${f.price}\n${f.departTime} → ${f.arriveTime}\n${f.bookingUrl}`).join("\n\n")
            : "검색 결과가 없어요."
        );
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        await interaction.editReply({ embeds: [errorEmbed(`검색 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`)] });
      }
      return;
    }

    // 숙소
    if (!returnDate) {
      await interaction.editReply({ embeds: [errorEmbed("숙소는 체크아웃 날짜가 필요해요. `복귀일`을 입력해주세요.")] });
      return;
    }

    try {
      const hotels = await searchHotels({ location, travelers, checkIn: departDate, checkOut: returnDate, sortBy });
      const sortLabel = sortBy === "rating" ? "평점" : sortBy === "recommended" ? "추천순" : "가격";
      const embed = baseEmbed(`🏨 ${location} 숙소 (${travelers}명, 우선순위: ${sortLabel})`);
      embed.setDescription(
        hotels.length > 0
          ? hotels.map((h) => `**${h.name}** ${h.price} (평점 ${h.rating})\n${h.bookingUrl}`).join("\n\n")
          : "검색 결과가 없어요."
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`검색 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`)] });
    }
  },
};

export const commands: Command[] = [searchCommand];
