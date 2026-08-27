import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { addRole, assignRole, listRolesWithAssignees, randomAssign } from "../db/repositories/roleRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";

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
        .setName("배정")
        .setDescription("역할을 사람에게 배정합니다 (여러 명 배정 가능)")
        .addStringOption((opt) => opt.setName("역할").setDescription("역할 이름").setRequired(true).setAutocomplete(true))
        .addUserOption((opt) => opt.setName("대상").setDescription("배정할 사람").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("랜덤")
        .setDescription("사다리타기처럼 참가자들에게 역할을 무작위로 나눠줍니다")
        .addUserOption((opt) => opt.setName("대상1").setDescription("참가자").setRequired(true))
        .addUserOption((opt) => opt.setName("대상2").setDescription("참가자").setRequired(false))
        .addUserOption((opt) => opt.setName("대상3").setDescription("참가자").setRequired(false))
        .addUserOption((opt) => opt.setName("대상4").setDescription("참가자").setRequired(false))
        .addUserOption((opt) => opt.setName("대상5").setDescription("참가자").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("보기").setDescription("역할별 배정 현황을 봅니다")),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction);
    if (!trip) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "추가") {
      const name = interaction.options.getString("이름", true);
      await addRole(trip.id, name);
      await interaction.reply({ embeds: [baseEmbed("역할 추가됨").setDescription(`"${name}" 역할이 추가되었어요.`)] });
      return;
    }

    if (sub === "배정") {
      const roleName = interaction.options.getString("역할", true);
      const target = interaction.options.getUser("대상", true);

      try {
        await assignRole(trip.id, roleName, target.id);
        await interaction.reply({
          embeds: [baseEmbed("역할 배정됨").setDescription(`<@${target.id}> 님이 "${roleName}" 역할을 맡았어요.`)],
        });
      } catch (err) {
        if (err instanceof Error && err.message === "ROLE_NOT_FOUND") {
          await interaction.reply({
            embeds: [errorEmbed(`"${roleName}" 역할을 찾지 못했어요. \`/역할 추가\`로 먼저 만들어주세요.`)],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        throw err;
      }
      return;
    }

    if (sub === "랜덤") {
      const participantIds = ["대상1", "대상2", "대상3", "대상4", "대상5"]
        .map((name) => interaction.options.getUser(name)?.id)
        .filter((id): id is string => Boolean(id));

      // 역할 수만큼 트랜잭션 내에서 여러 번 upsert하므로 3초 응답 제한을 피하기 위해 defer한다.
      await interaction.deferReply();

      try {
        const assignment = await randomAssign(trip.id, participantIds);
        const lines = Array.from(assignment.entries()).map(
          ([roleName, userIds]) => `**${roleName}**: ${userIds.length > 0 ? userIds.map((id) => `<@${id}>`).join(", ") : "미배정"}`
        );
        await interaction.editReply({ embeds: [baseEmbed("역할 랜덤 배정 완료 🎲").setDescription(lines.join("\n"))] });
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
      await interaction.reply({ embeds: [baseEmbed("역할 목록").setDescription("아직 등록된 역할이 없어요.")] });
      return;
    }

    const embed = baseEmbed(`${trip.destination} 역할 현황`);
    for (const role of roles) {
      const assignees = role.assignments.map((a) => `<@${a.userId}>`).join(", ") || "미배정";
      embed.addFields({ name: role.name, value: assignees });
    }
    await interaction.reply({ embeds: [embed] });
  },
};

export const commands: Command[] = [roleCommand];
