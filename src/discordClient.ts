import { Client, Collection } from "discord.js";
import { Command } from "./commands/types";

export interface TripCordClient extends Client {
  commands: Collection<string, Command>;
}

export function createClientWithCommands(client: Client, commands: Command[]): TripCordClient {
  const extended = client as TripCordClient;
  extended.commands = new Collection();
  for (const command of commands) {
    extended.commands.set(command.data.name, command);
  }
  return extended;
}
