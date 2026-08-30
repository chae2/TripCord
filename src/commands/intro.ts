import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { getParticipant, setIntro } from "../db/repositories/participantRepo";
import { baseEmbed, errorEmbed } from "../utils/embeds";

const introCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("자기소개")
    .setDescription("웹 대시보드/조회용 내 소개를 등록하거나 다른 사람 소개를 봅니다")
    .addSubcommand((sub) =>
      sub
        .setName("등록")
        .setDescription("내 소개를 등록합니다")
        .addStringOption((opt) => opt.setName("이름").setDescription("이름").setRequired(true))
        .addStringOption((opt) => opt.setName("별명").setDescription("별명").setRequired(false))
        .addStringOption((opt) => opt.setName("좋아하는것").setDescription("좋아하는 것").setRequired(false))
        .addStringOption((opt) => opt.setName("싫어하는것").setDescription("싫어하는 것").setRequired(false))
        .addStringOption((opt) => opt.setName("특이사항").setDescription("특이사항").setRequired(false))
        .addStringOption((opt) => opt.setName("이외내용").setDescription("그 밖에 하고 싶은 말").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("보기")
        .setDescription("다른 사람의 소개를 봅니다 (나에게만 보여요)")
        .addUserOption((opt) => opt.setName("사람").setDescription("소개를 볼 사람").setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction, { ephemeral: true });
    if (!trip) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "등록") {
      await setIntro({
        tripId: trip.id,
        discordUserId: interaction.user.id,
        displayName: interaction.user.displayName ?? interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL(),
        intro: {
          introName: interaction.options.getString("이름", true),
          nickname: interaction.options.getString("별명") ?? undefined,
          likes: interaction.options.getString("좋아하는것") ?? undefined,
          dislikes: interaction.options.getString("싫어하는것") ?? undefined,
          quirks: interaction.options.getString("특이사항") ?? undefined,
          extra: interaction.options.getString("이외내용") ?? undefined,
        },
      });

      await interaction.editReply({ embeds: [baseEmbed("소개 등록됨").setDescription("웹 대시보드와 `/자기소개 보기`에서 확인할 수 있어요.")] });
      return;
    }

    // 보기
    const target = interaction.options.getUser("사람", true);
    const participant = await getParticipant(trip.id, target.id);

    if (!participant || !participant.introName) {
      await interaction.editReply({ embeds: [errorEmbed(`<@${target.id}> 님은 아직 자기소개를 등록하지 않았어요.`)] });
      return;
    }

    const embed = baseEmbed(`${participant.introName} 님의 소개`);
    if (participant.nickname) embed.addFields({ name: "별명", value: participant.nickname, inline: true });
    if (participant.likes) embed.addFields({ name: "좋아하는 것", value: participant.likes });
    if (participant.dislikes) embed.addFields({ name: "싫어하는 것", value: participant.dislikes });
    if (participant.quirks) embed.addFields({ name: "특이사항", value: participant.quirks });
    if (participant.extra) embed.addFields({ name: "이외내용", value: participant.extra });

    await interaction.editReply({ embeds: [embed] });
  },
};

export const commands: Command[] = [introCommand];
