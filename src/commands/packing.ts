import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { addPackingItem, checkPackingItem, listPackingItems } from "../db/repositories/packingRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";

const packingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("준비")
    .setDescription("내 여행 준비물을 관리합니다")
    .addSubcommand((sub) =>
      sub
        .setName("추가")
        .setDescription("준비물을 추가합니다")
        .addStringOption((opt) => opt.setName("물품").setDescription("챙겨야 할 물품").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("목록").setDescription("내 준비물 목록을 확인합니다"))
    .addSubcommand((sub) =>
      sub
        .setName("완료")
        .setDescription("준비물을 챙겼다고 체크합니다")
        .addStringOption((opt) => opt.setName("물품").setDescription("체크할 물품").setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === "추가") {
      const item = interaction.options.getString("물품", true);
      await addPackingItem({ tripId: trip.id, userId, item });
      await interaction.reply({ embeds: [baseEmbed("준비물 추가됨").setDescription(`"${item}" 을(를) 목록에 추가했어요.`)], flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "완료") {
      const item = interaction.options.getString("물품", true);
      const count = await checkPackingItem({ tripId: trip.id, userId, item });
      if (count === 0) {
        await interaction.reply({ embeds: [errorEmbed(`"${item}" 항목을 찾지 못했어요.`)], flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({ embeds: [baseEmbed("체크 완료 ✅").setDescription(`"${item}" 챙겼어요!`)], flags: MessageFlags.Ephemeral });
      return;
    }

    // 목록
    const items = await listPackingItems(trip.id, userId);
    if (items.length === 0) {
      await interaction.reply({ embeds: [baseEmbed("준비물 목록").setDescription("아직 등록된 준비물이 없어요.")], flags: MessageFlags.Ephemeral });
      return;
    }

    const lines = items.map((i) => `${i.checked ? "✅" : "⬜"} ${i.item}`).join("\n");
    await interaction.reply({ embeds: [baseEmbed(`${trip.destination} 내 준비물`).setDescription(lines)], flags: MessageFlags.Ephemeral });
  },
};

export const commands: Command[] = [packingCommand];
