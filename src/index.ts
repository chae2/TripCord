import { Client, GatewayIntentBits, Partials } from "discord.js";
import { env } from "./config/env";
import { createClientWithCommands } from "./discordClient";
import { registerReady } from "./events/ready";
import { registerInteractionCreate } from "./events/interactionCreate";
import { registerMessageCreate } from "./events/messageCreate";

import { commands as tripCommands } from "./commands/trip";
import { commands as itineraryCommands } from "./commands/itinerary";
import { commands as settlementCommands } from "./commands/settlement";
import { commands as packingCommands } from "./commands/packing";
import { commands as galleryCommands } from "./commands/gallery";
import { commands as searchCommands } from "./commands/search";
import { commands as roleCommands } from "./commands/role";
import { commands as recommendCommands } from "./commands/recommend";
import { commands as mealRecommendCommands } from "./commands/mealRecommend";
import { commands as introCommands } from "./commands/intro";

const allCommands = [
  ...tripCommands,
  ...itineraryCommands,
  ...settlementCommands,
  ...packingCommands,
  ...galleryCommands,
  ...searchCommands,
  ...roleCommands,
  ...recommendCommands,
  ...mealRecommendCommands,
  ...introCommands,
];

const baseClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // @everyone 멘션 해석(길드 멤버 전체 조회)에 필요
  ],
  partials: [Partials.Message, Partials.Channel],
});

const client = createClientWithCommands(baseClient, allCommands);

registerReady(client);
registerInteractionCreate(client);
registerMessageCreate(client);

client.login(env.discordToken);
