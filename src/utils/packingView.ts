import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { PackingItem } from "@prisma/client";
import { baseEmbed } from "./embeds";

export const PACKING_TOGGLE_PREFIX = "packing:toggle";
const MAX_BUTTONS = 25;
const BUTTONS_PER_ROW = 5;
const BUTTON_LABEL_MAX = 20;

function checklistLines(items: PackingItem[]): string {
  if (items.length === 0) return "없음";
  return items.map((i) => `- [${i.checked ? "x" : " "}] ${i.item}`).join("\n");
}

export function buildPackingEmbed(title: string, shared: PackingItem[], personal: PackingItem[]): EmbedBuilder {
  return baseEmbed(title).addFields(
    { name: "🧳 공통 준비물", value: checklistLines(shared) },
    { name: "🙋 내 준비물", value: checklistLines(personal) }
  );
}

export function packingToggleCustomId(tripId: string, itemId: string): string {
  return `${PACKING_TOGGLE_PREFIX}:${tripId}:${itemId}`;
}

export function parsePackingToggleCustomId(customId: string): { tripId: string; itemId: string } {
  const [, , tripId, itemId] = customId.split(":");
  return { tripId: tripId!, itemId: itemId! };
}

export function buildPackingButtons(
  tripId: string,
  shared: PackingItem[],
  personal: PackingItem[]
): ActionRowBuilder<ButtonBuilder>[] {
  const combined = [...shared, ...personal].slice(0, MAX_BUTTONS);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let i = 0; i < combined.length; i += BUTTONS_PER_ROW) {
    const chunk = combined.slice(i, i + BUTTONS_PER_ROW);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        chunk.map((item) =>
          new ButtonBuilder()
            .setCustomId(packingToggleCustomId(tripId, item.id))
            .setLabel(item.item.length > BUTTON_LABEL_MAX ? `${item.item.slice(0, BUTTON_LABEL_MAX - 1)}…` : item.item)
            .setEmoji(item.checked ? "✅" : "⬜")
            .setStyle(item.checked ? ButtonStyle.Success : ButtonStyle.Secondary)
        )
      )
    );
  }

  return rows;
}
