import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const GALLERY_PREFIX = "gallery";
const EMPTY = "_";

export interface GalleryFilter {
  dayNumber?: number;
  locationTag?: string;
}

export function galleryCustomId(
  direction: "prev" | "next",
  tripId: string,
  index: number,
  filter: GalleryFilter
): string {
  const day = filter.dayNumber !== undefined ? String(filter.dayNumber) : EMPTY;
  const loc = filter.locationTag ? encodeURIComponent(filter.locationTag) : EMPTY;
  return [GALLERY_PREFIX, direction, tripId, index, day, loc].join(":");
}

export function parseGalleryCustomId(customId: string): {
  direction: "prev" | "next";
  tripId: string;
  index: number;
  filter: GalleryFilter;
} {
  const [, direction, tripId, index, day, loc] = customId.split(":");
  return {
    direction: direction as "prev" | "next",
    tripId: tripId!,
    index: Number(index),
    filter: {
      dayNumber: day && day !== EMPTY ? Number(day) : undefined,
      locationTag: loc && loc !== EMPTY ? decodeURIComponent(loc) : undefined,
    },
  };
}

export function galleryButtons(
  tripId: string,
  index: number,
  total: number,
  filter: GalleryFilter
): ActionRowBuilder<ButtonBuilder> {
  const prev = new ButtonBuilder()
    .setCustomId(galleryCustomId("prev", tripId, index, filter))
    .setLabel("◀ 이전")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(index <= 0);

  const next = new ButtonBuilder()
    .setCustomId(galleryCustomId("next", tripId, index, filter))
    .setLabel("다음 ▶")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(index >= total - 1);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next);
}
