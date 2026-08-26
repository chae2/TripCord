import { Message } from "discord.js";
import { TripCordClient } from "../discordClient";
import { getActiveTrip } from "../db/repositories/tripRepo";
import { addPhoto } from "../db/repositories/photoRepo";
import { mirrorAttachment } from "../services/storageClient";
import { dayNumberFor } from "../utils/dateHelpers";
import { detectSuggestion } from "../agent/contextAgent";

const IMAGE_CONTENT_TYPE = /^image\//;

export function registerMessageCreate(client: TripCordClient): void {
  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot || !message.guildId) return;

    const trip = await getActiveTrip(message.guildId);

    const imageAttachments = message.attachments.filter((a) => a.contentType && IMAGE_CONTENT_TYPE.test(a.contentType));
    if (trip && imageAttachments.size > 0) {
      for (const attachment of imageAttachments.values()) {
        try {
          const storageUrl = await mirrorAttachment({
            attachmentUrl: attachment.url,
            fileName: attachment.name,
            tripId: trip.id,
            contentType: attachment.contentType ?? "image/jpeg",
          });

          await addPhoto({
            tripId: trip.id,
            discordMessageId: message.id,
            uploaderId: message.author.id,
            storageUrl,
            postedAt: message.createdAt,
            dayNumber: dayNumberFor(trip.startDate, message.createdAt),
          });
        } catch (err) {
          console.error("[messageCreate] 사진 저장 실패:", err);
        }
      }
      await message.react("📷").catch(() => undefined);
    }

    if (message.content) {
      const suggestion = detectSuggestion(message.content);
      if (suggestion) {
        await message.reply({
          content: `${suggestion.reason} \`${suggestion.command}\` 로 등록해드릴까요?`,
        }).catch(() => undefined);
      }
    }
  });
}
