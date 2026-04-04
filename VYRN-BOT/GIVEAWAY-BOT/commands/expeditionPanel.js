// singleFileBot.js
const { Client, GatewayIntentBits, Collection, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ======================
// Baza ekspedycji w pamięci
// ======================
const expeditions = new Map(); // userId => endTime

function startExpedition(userId, minutes) {
  const endTime = Date.now() + minutes * 60 * 1000;
  expeditions.set(userId, endTime);
  return endTime;
}

// ======================
// Komenda /expedition
// ======================
const expeditionCommand = {
  data: new SlashCommandBuilder()
    .setName("expedition")
    .setDescription("Ustaw ekspedycję dla swojego zwierzaka"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🐾 Pet Adventures")
      .setDescription("Wybierz czas ekspedycji dla swojego zwierzaka:")
      .setColor("#ffcc00")
      .setImage("https://i.imgur.com/6pvEODD.png");

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("expedition_time_select")
        .setPlaceholder("Wybierz czas ekspedycji")
        .addOptions([
          { label: "15 Min", value: "15" },
          { label: "1 Hour", value: "60" },
          { label: "4 Hours", value: "240" },
          { label: "12 Hours", value: "720" }
        ])
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};

// ======================
// Obsługa interakcji
// ======================
client.on("interactionCreate", async (interaction) => {
  try {
    // =========================
    // SELECT MENU EXPEDITION
    // =========================
    if (interaction.isStringSelectMenu() && interaction.customId === "expedition_time_select") {
      const minutes = parseInt(interaction.values[0]);
      const userId = interaction.user.id;

      startExpedition(userId, minutes);

      await interaction.update({
        content: `⏳ Ekspedycja ustawiona na ${minutes} minut! Powiadomienie przyjdzie na DM po zakończeniu.`,
        components: [],
        embeds: []
      });

      // Powiadomienie po zakończeniu ekspedycji
      setTimeout(async () => {
        try {
          const user = await client.users.fetch(userId);
          user.send(`✅ Twoja ekspedycja ${minutes} minut zakończona! 🐾`);
        } catch (err) {
          console.error("Nie udało się wysłać DM:", err);
        }
      }, minutes * 60 * 1000);

      return;
    }

    // =========================
    // SLASH COMMANDS
    // =========================
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "expedition") {
        return expeditionCommand.execute(interaction);
      }
    }
  } catch (err) {
    console.error("❌ Błąd interakcji:", err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ Wystąpił błąd", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Wystąpił błąd", ephemeral: true });
      }
    } catch {}
  }
});

// ======================
// Rejestracja komendy przy starcie bota (guild test)
// ======================
const { REST, Routes } = require("discord.js");
const token = process.env.TOKEN; // Railway
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

(async () => {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    console.log("🚀 Rejestracja komendy /expedition...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [expeditionCommand.data.toJSON()]
    });
    console.log("✅ Komenda zarejestrowana!");
  } catch (err) {
    console.error(err);
  }

  client.login(token);
})();
