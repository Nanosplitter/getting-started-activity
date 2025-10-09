import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const commands = [
  new SlashCommandBuilder()
    .setName("connections")
    .setDescription("Start playing Connections and share your progress")
    .setContexts([0, 1, 2]) // 0 = Guild, 1 = Bot DM, 2 = Private Channel
    .setIntegrationTypes([0, 1]) // 0 = Guild Install, 1 = User Install
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

try {
  console.log("Started refreshing application (/) commands.");

  // Get existing commands to preserve the Entry Point command
  const existingCommands = await rest.get(Routes.applicationCommands(process.env.VITE_DISCORD_CLIENT_ID));

  console.log("Existing commands:", existingCommands.map((c) => c.name));

  // Find the entry point command (usually named "launch" and has handler === 1)
  const entryPointCommand = existingCommands.find((cmd) => cmd.name === "launch" || cmd.handler === 1);

  console.log("Entry point command found:", entryPointCommand ? entryPointCommand.name : "none");

  // Merge with existing entry point command if present
  const allCommands = entryPointCommand ? [entryPointCommand, ...commands] : commands;

  console.log("Registering commands:", allCommands.map((c) => c.name));

  await rest.put(Routes.applicationCommands(process.env.VITE_DISCORD_CLIENT_ID), { body: allCommands });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}
