import { Client, GatewayIntentBits, Partials } from "discord.js";
import { env } from "./config/env";
import { createClientWithCommands } from "./discordClient";
import { registerReady } from "./events/ready";
import { registerInteractionCreate } from "./events/interactionCreate";
import { registerMessageCreate } from "./events/messageCreate";

import { commands as tripCommands } from "./commands/trip";
import { commands as scheduleCommands } from "./commands/schedule";
import { commands as settlementCommands } from "./commands/settlement";
import { commands as packingCommands } from "./commands/packing";
import { commands as galleryCommands } from "./commands/gallery";
import { commands as searchCommands } from "./commands/search";

const allCommands = [
  ...tripCommands,
  ...scheduleCommands,
  ...settlementCommands,
  ...packingCommands,
  ...galleryCommands,
  ...searchCommands,
];

const baseClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

const client = createClientWithCommands(baseClient, allCommands);

registerReady(client);
registerInteractionCreate(client);
registerMessageCreate(client);

client.login(env.discordToken);
