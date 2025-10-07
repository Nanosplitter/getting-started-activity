import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const commands = [
  new SlashCommandBuilder().setName("connections").setDescription("Post today's Connections game prompt").toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

try {
  console.log("Started refreshing application (/) commands.");

  await rest.put(Routes.applicationCommands(process.env.VITE_DISCORD_CLIENT_ID), { body: commands });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}
