import { REST, Routes } from "discord.js";
import { env } from "../src/config/env";

import { commands as tripCommands } from "../src/commands/trip";
import { commands as itineraryCommands } from "../src/commands/itinerary";
import { commands as settlementCommands } from "../src/commands/settlement";
import { commands as packingCommands } from "../src/commands/packing";
import { commands as galleryCommands } from "../src/commands/gallery";
import { commands as searchCommands } from "../src/commands/search";
import { commands as roleCommands } from "../src/commands/role";
import { commands as recommendCommands } from "../src/commands/recommend";
import { commands as introCommands } from "../src/commands/intro";

const allCommands = [
  ...tripCommands,
  ...itineraryCommands,
  ...settlementCommands,
  ...packingCommands,
  ...galleryCommands,
  ...searchCommands,
  ...roleCommands,
  ...recommendCommands,
  ...introCommands,
];

async function main() {
  const rest = new REST().setToken(env.discordToken);
  const body = allCommands.map((c) => c.data.toJSON());

  if (env.discordDevGuildId) {
    await rest.put(Routes.applicationGuildCommands(env.discordClientId, env.discordDevGuildId), { body });
    console.log(`[deployCommands] 개발 길드(${env.discordDevGuildId})에 ${body.length}개 커맨드 등록 완료`);
  } else {
    await rest.put(Routes.applicationCommands(env.discordClientId), { body });
    console.log(`[deployCommands] 글로벌로 ${body.length}개 커맨드 등록 완료 (전파에 최대 1시간 소요)`);
  }
}

main().catch((err) => {
  console.error("[deployCommands] 실패:", err);
  process.exit(1);
});
