import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { PackingScope } from "@prisma/client";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { addPackingItems, listPersonalItems, listSharedItems } from "../db/repositories/packingRepo";
import { buildPackingButtons, buildPackingEmbed } from "../utils/packingView";

const ITEM_OPTION_DESCRIPTION = "물품 이름을 띄어쓰기로 구분해 한 번에 여러 개 추가할 수 있어요 (예: 생수 초콜릿 여벌바지)";

function splitItems(input: string): string[] {
  return input
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0);
}

const packingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("준비")
    .setDescription("여행 준비물을 체크리스트로 관리합니다")
    .addSubcommand((sub) =>
      sub
        .setName("추가")
        .setDescription("내 준비물을 추가합니다 (나만 볼 수 있어요)")
        .addStringOption((opt) => opt.setName("물품").setDescription(ITEM_OPTION_DESCRIPTION).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("공통추가")
        .setDescription("모두가 보고 체크할 수 있는 공통 준비물을 추가합니다")
        .addStringOption((opt) => opt.setName("물품").setDescription(ITEM_OPTION_DESCRIPTION).setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("목록").setDescription("공통 준비물과 내 준비물을 체크리스트로 봅니다")),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction, { ephemeral: true });
    if (!trip) return;

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === "추가" || sub === "공통추가") {
      const raw = interaction.options.getString("물품", true);
      const items = splitItems(raw);
      await addPackingItems({
        tripId: trip.id,
        userId,
        scope: sub === "공통추가" ? PackingScope.SHARED : PackingScope.PERSONAL,
        items,
      });
    }

    const [shared, personal] = await Promise.all([listSharedItems(trip.id), listPersonalItems(trip.id, userId)]);

    await interaction.editReply({
      embeds: [buildPackingEmbed(`${trip.destination} 준비물`, shared, personal)],
      components: buildPackingButtons(trip.id, shared, personal),
    });
  },
};

export const commands: Command[] = [packingCommand];
