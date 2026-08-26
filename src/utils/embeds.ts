import { EmbedBuilder } from "discord.js";

export function baseEmbed(title: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setColor(0x5865f2).setTimestamp(new Date());
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setTitle("오류").setDescription(message).setColor(0xed4245);
}
