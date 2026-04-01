const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// SYSTEMY
const { handleGiveaway } = require("./utils/giveawaySystem");
const { handleEventInteraction } = require("./utils/eventSystem");
const { startVoiceXP } = require("./utils/levelSystem");

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

// ===== LOAD COMMANDS =====
const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (!command?.data?.name) continue;

  client.commands.set(command.data.name, command);
}

// ===== INTERACTIONS =====
client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction, client);
    }

    if (interaction.isButton()) {
      await handleGiveaway(interaction);
      await handleEventInteraction(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      await handleEventInteraction(interaction);
    }

  } catch (err) {
    console.error("❌ Interaction error:", err);

    if (interaction.replied || interaction.deferred) {
      interaction.followUp({ content: "❌ Error!", flags: 64 }).catch(()=>{});
    } else {
      interaction.reply({ content: "❌ Error!", flags: 64 }).catch(()=>{});
    }
  }
});

// ===== READY =====
client.once("ready", () => {
  console.log(`🔥 Logged as ${client.user.tag}`);

  // 🔥 START VOICE XP (NAJWAŻNIEJSZE)
  startVoiceXP(client);
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
