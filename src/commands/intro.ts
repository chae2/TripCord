import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./types";
import { requireActiveTrip } from "./helpers";
import { setBio } from "../db/repositories/participantRepo";
import { baseEmbed } from "../utils/embeds";

const introCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("자기소개")
    .setDescription("웹 대시보드에 표시될 내 소개를 등록합니다")
    .addStringOption((opt) => opt.setName("내용").setDescription("소개 문구").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const trip = await requireActiveTrip(interaction, { ephemeral: true });
    if (!trip) return;

    const bio = interaction.options.getString("내용", true);
    await setBio({
      tripId: trip.id,
      discordUserId: interaction.user.id,
      bio,
      displayName: interaction.user.displayName ?? interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL(),
    });

    await interaction.editReply({ embeds: [baseEmbed("소개 등록됨").setDescription(bio)] });
  },
};

export const commands: Command[] = [introCommand];
