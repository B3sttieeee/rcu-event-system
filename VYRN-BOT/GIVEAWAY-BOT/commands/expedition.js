const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

// ====================== CONFIG ======================
const EXPEDITION_LOCATIONS = {
  "Wood":       { name: "🌲 Wood (Spawn/Farm)",     emoji: "🌲" },
  "Cactus":     { name: "🌵 Cactus (Desert)",      emoji: "🌵" },
  "Nuclear":    { name: "☢️ Nuclear",               emoji: "☢️" },
  "Atlantis":   { name: "🌊 Atlantis",              emoji: "🌊" },
  "Royal":      { name: "👑 Royal (Kingdom)",       emoji: "👑" },
  "Hacker":     { name: "💻 Hacker (City)",         emoji: "💻" },
  "Diamond":    { name: "💎 Diamond (Cave)",        emoji: "💎" },
  "Lava":       { name: "🌋 Lava (Volcano)",        emoji: "🌋" },
  "Heaven":     { name: "☁️ Heaven",                emoji: "☁️" },
  "Magic":      { name: "✨ Magic",                  emoji: "✨" },
  "Circus":     { name: "🎪 Circus",                emoji: "🎪" },
  "Jungle":     { name: "🌴 Jungle",                emoji: "🌴" },
  "Steampunk":  { name: "⚙️ Steampunk",             emoji: "⚙️" },
  "Sakura":     { name: "🌸 Sakura",                emoji: "🌸" }
};

const DURATIONS = [
  { label: "1 Hour",  value: "60",  minutes: 60 },
  { label: "3 Hours", value: "180", minutes: 180 },
  { label: "6 Hours", value: "360", minutes: 360 }
];

// ====================== PAMIĘĆ EKSPEDYCJI ======================
const expeditions = new Map(); // userId => { location, endTime }

// ====================== KOMENDA ======================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("expedition")
    .setDescription("Wyślij swojego Lumberjacka na ekspedycję"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setTitle("🪓 Lumberjack House")
      .setDescription("Wybierz lokację i czas swojego Lumberjacka.\nPo zakończeniu otrzymasz powiadomienie na DM.")
      .setImage("https://imgur.com/d410WPL.png")
      .setFooter({ text: "VYRN • Lumberjack System" })
      .setTimestamp();

    const locationMenu = new StringSelectMenuBuilder()
      .setCustomId("expedition_location")
      .setPlaceholder("Wybierz lokację...")
      .addOptions(
        Object.entries(EXPEDITION_LOCATIONS).map(([key, loc]) => ({
          label: loc.name,
          value: key,
          emoji: loc.emoji
        }))
      );

    const durationMenu = new StringSelectMenuBuilder()
      .setCustomId("expedition_duration")
      .setPlaceholder("Wybierz czas trwania...")
      .addOptions(
        DURATIONS.map(d => ({
          label: d.label,
          value: d.value
        }))
      );

    const row1 = new ActionRowBuilder().addComponents(locationMenu);
    const row2 = new ActionRowBuilder().addComponents(durationMenu);

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2],
      ephemeral: true
    });
  },

  // Obsługa wyboru lokacji + czasu
  async handleExpeditionSelect(interaction) {
    const customId = interaction.customId;

    // Jeśli to dopiero wybór lokacji lub czasu – czekamy na drugi wybór
    if (!expeditions.has(interaction.user.id)) {
      return interaction.deferUpdate(); // czekamy na drugi wybór
    }

    // Tutaj wchodzimy tylko gdy oba wybory są zrobione (obsługujemy w innym miejscu)
  }
};

// ====================== OBSŁUGA WYBORU LOKACJI I CZASU ======================
async function handleExpeditionSelection(interaction) {
  const userId = interaction.user.id;
  const customId = interaction.customId;
  const value = interaction.values[0];

  if (!expeditions.has(userId)) {
    expeditions.set(userId, {});
  }

  const data = expeditions.get(userId);

  if (customId === "expedition_location") {
    data.location = value;
  } else if (customId === "expedition_duration") {
    data.duration = parseInt(value);
  }

  // Jeśli mamy już lokację i czas – startujemy ekspedycję
  if (data.location && data.duration) {
    const endTime = Date.now() + data.duration * 60 * 1000;
    data.endTime = endTime;

    const locName = EXPEDITION_LOCATIONS[data.location].name;

    await interaction.update({
      content: `🪓 **${locName}** — ekspedycja rozpoczęta na **${data.duration} minut**!\n\nOtrzymasz powiadomienie na DM po zakończeniu.`,
      components: [],
      embeds: []
    });

    // Powiadomienie DM po zakończeniu
    setTimeout(async () => {
      try {
        const user = await interaction.client.users.fetch(userId);
        await user.send(`✅ Twoja ekspedycja **${locName}** została zakończona!\n\nWróć do Lumberjack House, aby odebrać nagrodę. 🪓`);
      } catch (err) {
        console.error("Nie udało się wysłać DM:", err);
      }
      expeditions.delete(userId);
    }, data.duration * 60 * 1000);
  } else {
    // Czekamy na drugi wybór
    await interaction.deferUpdate();
  }
}

// Eksportujemy też funkcję obsługi select menu
module.exports.handleExpeditionSelect = handleExpeditionSelection;
