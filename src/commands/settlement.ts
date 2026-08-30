import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { getBalances, recordExpense, resetExpenses } from "../db/repositories/expenseRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";
import { extractMentionedUserIds } from "../utils/mentions";

const settlementCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("정산")
    .setDescription("여행 경비를 기록하고 정산 현황을 확인합니다")
    .addSubcommand((sub) =>
      sub
        .setName("기록")
        .setDescription("내가 결제한 금액을 멘션된 사람들과 N분의 1로 나눕니다")
        .addStringOption((opt) =>
          opt
            .setName("대상")
            .setDescription("함께 나눌 사람들을 멘션하세요 (예: @채일 @밀라노, 여러 명 가능)")
            .setRequired(true)
        )
        .addIntegerOption((opt) => opt.setName("액수").setDescription("결제한 총액").setRequired(true).setMinValue(1))
        .addStringOption((opt) => opt.setName("메모").setDescription("무엇을 결제했는지").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("현황").setDescription("사용자별 정산 잔액을 확인합니다"))
    .addSubcommand((sub) => sub.setName("초기화").setDescription("(관리자) 이 여행의 정산 기록을 모두 삭제합니다")),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "기록") {
      const amount = interaction.options.getInteger("액수", true);
      const memo = interaction.options.getString("메모") ?? undefined;
      const mentionedUserIds = extractMentionedUserIds(interaction.options.getString("대상", true));

      if (mentionedUserIds.length === 0) {
        await interaction.editReply({
          embeds: [errorEmbed("함께 나눌 사람을 멘션해주세요. 예: `/정산 기록 대상:@채일 @밀라노 액수:30000`")],
        });
        return;
      }

      const expense = await recordExpense({
        tripId: trip.id,
        payerId: interaction.user.id,
        amount,
        memo,
        mentionedUserIds,
      });

      const shareLines = expense.shares.map((s) => `<@${s.userId}> : ${s.shareAmount.toLocaleString()}원`).join("\n");

      await interaction.editReply({
        embeds: [
          baseEmbed("정산 기록됨 💸")
            .setDescription(`<@${interaction.user.id}>님이 ${amount.toLocaleString()}원 결제${memo ? ` (${memo})` : ""}`)
            .addFields({ name: "N분의 1 분배", value: shareLines }),
        ],
      });
      return;
    }

    if (sub === "현황") {
      const balances = await getBalances(trip.id);
      if (balances.length === 0) {
        await interaction.editReply({ embeds: [baseEmbed("정산 현황").setDescription("아직 기록된 정산이 없어요.")] });
        return;
      }

      const lines = balances.map((b) => {
        const sign = b.netAmount > 0 ? "받을 돈" : b.netAmount < 0 ? "낼 돈" : "정산 완료";
        return `<@${b.userId}> : ${sign} ${Math.abs(b.netAmount).toLocaleString()}원`;
      });

      await interaction.editReply({
        embeds: [baseEmbed(`${trip.destination} 정산 현황`).setDescription(lines.join("\n"))],
      });
      return;
    }

    // 초기화
    const member = interaction.member;
    const isAdmin =
      member && typeof member.permissions !== "string" && member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isAdmin) {
      await interaction.editReply({ embeds: [errorEmbed("정산 초기화는 서버 관리자만 할 수 있어요.")] });
      return;
    }

    await resetExpenses(trip.id);
    await interaction.editReply({ embeds: [baseEmbed("정산 초기화 완료").setDescription("이 여행의 정산 기록을 모두 삭제했어요.")] });
  },
};

export const commands: Command[] = [settlementCommand];
