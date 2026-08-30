import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import {
  addRole,
  assignRole,
  deleteRole,
  listRolesWithAssignees,
  randomAssign,
  renameRole,
  unassignRole,
} from "../db/repositories/roleRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";
import { resolveMentionedUserIds } from "../utils/mentions";

const roleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("역할")
    .setDescription("여행 준비 역할을 관리합니다")
    .addSubcommand((sub) =>
      sub
        .setName("추가")
        .setDescription("새 역할을 추가합니다")
        .addStringOption((opt) => opt.setName("이름").setDescription("역할 이름").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("삭제")
        .setDescription("역할을 삭제합니다 (배정 정보도 함께 삭제돼요)")
        .addStringOption((opt) => opt.setName("역할").setDescription("역할 이름").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("수정")
        .setDescription("역할 이름을 변경합니다")
        .addStringOption((opt) => opt.setName("역할").setDescription("기존 역할 이름").setRequired(true).setAutocomplete(true))
        .addStringOption((opt) => opt.setName("새이름").setDescription("바꿀 이름").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("배정")
        .setDescription("역할을 사람에게 배정합니다 (여러 명 배정 가능)")
        .addStringOption((opt) => opt.setName("역할").setDescription("역할 이름").setRequired(true).setAutocomplete(true))
        .addUserOption((opt) => opt.setName("대상").setDescription("배정할 사람").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("배정해제")
        .setDescription("특정 사람의 역할 배정을 해제합니다")
        .addStringOption((opt) => opt.setName("역할").setDescription("역할 이름").setRequired(true).setAutocomplete(true))
        .addUserOption((opt) => opt.setName("대상").setDescription("배정 해제할 사람").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("랜덤")
        .setDescription("참가자에게 역할을 무작위로 나눠줍니다 (재실행 시 이전 배정은 초기화됩니다)")
        .addStringOption((opt) =>
          opt
            .setName("대상")
            .setDescription("배정 대상 참가자들을 멘션하세요 (예: @채일 @밀라노, @everyone도 가능)")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName("보기").setDescription("역할별 배정 현황을 봅니다")),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "추가") {
      const name = interaction.options.getString("이름", true);
      await addRole(trip.id, name);
      await interaction.editReply({ embeds: [baseEmbed("역할 추가됨").setDescription(`"${name}" 역할이 추가되었어요.`)] });
      return;
    }

    if (sub === "삭제") {
      const roleName = interaction.options.getString("역할", true);
      try {
        await deleteRole(trip.id, roleName);
        await interaction.editReply({ embeds: [baseEmbed("역할 삭제됨").setDescription(`"${roleName}" 역할을 삭제했어요.`)] });
      } catch (err) {
        if (err instanceof Error && err.message === "ROLE_NOT_FOUND") {
          await interaction.editReply({ embeds: [errorEmbed(`"${roleName}" 역할을 찾지 못했어요.`)] });
          return;
        }
        throw err;
      }
      return;
    }

    if (sub === "수정") {
      const roleName = interaction.options.getString("역할", true);
      const newName = interaction.options.getString("새이름", true);
      try {
        await renameRole(trip.id, roleName, newName);
        await interaction.editReply({
          embeds: [baseEmbed("역할 이름 변경됨").setDescription(`"${roleName}" → "${newName}"`)],
        });
      } catch (err) {
        if (err instanceof Error && err.message === "ROLE_NOT_FOUND") {
          await interaction.editReply({ embeds: [errorEmbed(`"${roleName}" 역할을 찾지 못했어요.`)] });
          return;
        }
        if (err instanceof Error && err.message === "ROLE_NAME_TAKEN") {
          await interaction.editReply({ embeds: [errorEmbed(`"${newName}" 역할이 이미 있어요.`)] });
          return;
        }
        throw err;
      }
      return;
    }

    if (sub === "배정") {
      const roleName = interaction.options.getString("역할", true);
      const target = interaction.options.getUser("대상", true);

      try {
        await assignRole(trip.id, roleName, target.id);
        await interaction.editReply({
          embeds: [baseEmbed("역할 배정됨").setDescription(`<@${target.id}> 님이 "${roleName}" 역할을 맡았어요.`)],
        });
      } catch (err) {
        if (err instanceof Error && err.message === "ROLE_NOT_FOUND") {
          await interaction.editReply({
            embeds: [errorEmbed(`"${roleName}" 역할을 찾지 못했어요. \`/역할 추가\`로 먼저 만들어주세요.`)],
          });
          return;
        }
        throw err;
      }
      return;
    }

    if (sub === "배정해제") {
      const roleName = interaction.options.getString("역할", true);
      const target = interaction.options.getUser("대상", true);

      try {
        await unassignRole(trip.id, roleName, target.id);
        await interaction.editReply({
          embeds: [baseEmbed("배정 해제됨").setDescription(`<@${target.id}> 님을 "${roleName}" 역할에서 뺐어요.`)],
        });
      } catch (err) {
        if (err instanceof Error && err.message === "ROLE_NOT_FOUND") {
          await interaction.editReply({ embeds: [errorEmbed(`"${roleName}" 역할을 찾지 못했어요.`)] });
          return;
        }
        throw err;
      }
      return;
    }

    if (sub === "랜덤") {
      const participantIds = await resolveMentionedUserIds(interaction.guild, interaction.options.getString("대상", true));

      if (participantIds.length === 0) {
        await interaction.editReply({ embeds: [errorEmbed("배정할 참가자를 멘션해주세요. 예: `/역할 랜덤 대상:@채일 @밀라노`")] });
        return;
      }

      try {
        const assignment = await randomAssign(trip.id, participantIds);
        const lines = Array.from(assignment.entries()).map(
          ([roleName, userIds]) => `**${roleName}**: ${userIds.length > 0 ? userIds.map((id) => `<@${id}>`).join(", ") : "미배정"}`
        );
        await interaction.editReply({
          embeds: [baseEmbed("역할 랜덤 배정 완료 🎲").setDescription(`이전 배정은 초기화했어요.\n\n${lines.join("\n")}`)],
        });
      } catch (err) {
        if (err instanceof Error && err.message === "NO_ROLES") {
          await interaction.editReply({ embeds: [errorEmbed("등록된 역할이 없어요. `/역할 추가`로 먼저 만들어주세요.")] });
          return;
        }
        throw err;
      }
      return;
    }

    // 보기
    const roles = await listRolesWithAssignees(trip.id);
    if (roles.length === 0) {
      await interaction.editReply({ embeds: [baseEmbed("역할 목록").setDescription("아직 등록된 역할이 없어요.")] });
      return;
    }

    const embed = baseEmbed(`${trip.destination} 역할 현황`);
    for (const role of roles) {
      const assignees = role.assignments.map((a) => `<@${a.userId}>`).join(", ") || "미배정";
      embed.addFields({ name: role.name, value: assignees });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};

export const commands: Command[] = [roleCommand];
