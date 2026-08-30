import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { getPairwiseSettlement, recordExpense, resetExpenses } from "../db/repositories/expenseRepo";
import { DebtTransfer } from "../utils/settlementPairwise";
import { baseEmbed, errorEmbed } from "../utils/embeds";
import { resolveMentionedUserIds } from "../utils/mentions";

function formatTransfers(transfers: DebtTransfer[]): string {
  if (transfers.length === 0) return "정산할 내역이 없어요. 다들 깔끔해요!";
  return transfers.map((t) => `<@${t.fromUserId}> → <@${t.toUserId}> : ${t.amount.toLocaleString()}원`).join("\n");
}

const settlementCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("정산")
    .setDescription("여행 경비를 기록하고 정산 현황을 확인합니다")
    .addSubcommand((sub) =>
      sub
        .setName("기록")
        .setDescription("결제자가 대상 인원과 N분의 1로 나눈 금액을 기록합니다")
        .addUserOption((opt) => opt.setName("결제자").setDescription("실제로 결제한 사람").setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName("대상")
            .setDescription("함께 나눌 사람들을 멘션하세요 (예: @채일 @밀라노, @everyone도 가능)")
            .setRequired(true)
        )
        .addIntegerOption((opt) => opt.setName("액수").setDescription("결제한 총액").setRequired(true).setMinValue(1))
        .addStringOption((opt) => opt.setName("메모").setDescription("무엇을 결제했는지").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("현황")
        .setDescription("누가 누구에게 얼마를 보내야 하는지 확인합니다")
        .addUserOption((opt) => opt.setName("결제자").setDescription("이 사람과 관련된 내역만 보기").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("요청")
        .setDescription("나에게 보낼 돈이 있는 사람들에게 계좌를 안내합니다")
        .addUserOption((opt) => opt.setName("결제자").setDescription("정산받을 사람").setRequired(true))
        .addStringOption((opt) => opt.setName("계좌").setDescription("계좌번호(은행명 포함 권장)").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("초기화").setDescription("(관리자) 이 여행의 정산 기록을 모두 삭제합니다")),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "기록") {
      const payer = interaction.options.getUser("결제자", true);
      const amount = interaction.options.getInteger("액수", true);
      const memo = interaction.options.getString("메모") ?? undefined;
      const mentionedUserIds = await resolveMentionedUserIds(interaction.guild, interaction.options.getString("대상", true));

      if (mentionedUserIds.length === 0) {
        await interaction.editReply({
          embeds: [errorEmbed("함께 나눌 사람을 멘션해주세요. 예: `/정산 기록 결제자:@채일 대상:@밀라노 액수:30000`")],
        });
        return;
      }

      const expense = await recordExpense({
        tripId: trip.id,
        payerId: payer.id,
        amount,
        memo,
        mentionedUserIds,
      });

      const shareLines = expense.shares.map((s) => `<@${s.userId}> : ${s.shareAmount.toLocaleString()}원`).join("\n");

      await interaction.editReply({
        embeds: [
          baseEmbed("정산 기록됨 💸")
            .setDescription(`<@${payer.id}>님이 ${amount.toLocaleString()}원 결제${memo ? ` (${memo})` : ""}`)
            .addFields({ name: "N분의 1 분배", value: shareLines }),
        ],
      });
      return;
    }

    if (sub === "현황") {
      const filterUser = interaction.options.getUser("결제자");
      const transfers = await getPairwiseSettlement(trip.id);
      const filtered = filterUser
        ? transfers.filter((t) => t.fromUserId === filterUser.id || t.toUserId === filterUser.id)
        : transfers;

      await interaction.editReply({
        embeds: [
          baseEmbed(filterUser ? `${trip.destination} 정산 현황 (<@${filterUser.id}> 관련)` : `${trip.destination} 정산 현황`).setDescription(
            formatTransfers(filtered)
          ),
        ],
      });
      return;
    }

    if (sub === "요청") {
      const payer = interaction.options.getUser("결제자", true);
      const account = interaction.options.getString("계좌", true);
      const transfers = await getPairwiseSettlement(trip.id);
      const owedToPayer = transfers.filter((t) => t.toUserId === payer.id);

      if (owedToPayer.length === 0) {
        await interaction.editReply({ embeds: [baseEmbed("정산 요청").setDescription(`<@${payer.id}> 님에게 받을 돈이 없어요.`)] });
        return;
      }

      const lines = owedToPayer.map((t) => `<@${t.fromUserId}> : ${t.amount.toLocaleString()}원`).join("\n");

      await interaction.editReply({
        embeds: [
          baseEmbed(`💳 <@${payer.id}> 님에게 정산해주세요`)
            .setDescription(lines)
            .addFields({ name: "계좌", value: `\`\`\`${account}\`\`\`` }),
        ],
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
