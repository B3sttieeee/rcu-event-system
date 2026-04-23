// src/commands/lumberjack.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const LOCATIONS = {
  "Wood":     { name: "🌲 Wood (Spawn/Farm)", emoji: "🌲" },
  "Cactus":   { name: "🌵 Cactus (Desert)", emoji: "🌵" },
  "Nuclear":  { name: "☢️ Nuclear", emoji: "☢️" },
  "Atlantis": { name: "🌊 Atlantis", emoji: "🌊" },
  "Royal":    { name: "👑 Royal (Kingdom)", emoji: "👑" },
  "Hacker":   { name: "💻 Hacker (City)", emoji: "💻" },
  "Diamond":  { name: "💎 Diamond (Cave)", emoji: "💎" },
  "Lava":     { name: "🌋 Lava (Volcano)", emoji: "🌋" },
  "Heaven":   { name: "☁️ Heaven", emoji: "☁️" },
  "Magic":    { name: "✨ Magic", emoji: "✨" },
  "Circus":   { name: "🎪 Circus", emoji: "🎪" },
  "Jungle":   { name: "🌴 Jungle", emoji: "🌴" },
  "Steampunk": { name: "⚙️ Steampunk", emoji: "⚙️" },
  "Sakura":   { name: "🌸 Sakura", emoji: "🌸" }
};

const DURATIONS = [
  { label: "1 Hour",  value: "60",  minutes: 60 },
  { label: "3 Hours", value: "180", minutes: 180 },
  { label: "6 Hours", value: "360", minutes: 360 }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lumberjack")
    .setDescription("🪓 Wyślij swojego Lumberjacka na ekspedycję"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setTitle("🪓 Lumberjack House")
      .setDescription("Wybierz lokację i czas ekspedycji swojego Lumberjacka.\nPo zakończeniu otrzymasz powiadomienie na DM.")
      .setImage("https://imgur.com/d410WPL.png")
      .setFooter({ text: "VYRN • Lumberjack System" })
      .setTimestamp();

    const locationMenu = new StringSelectMenuBuilder()
      .setCustomId("lumberjack_location")
      .setPlaceholder("Wybierz lokację...")
      .addOptions(
        Object.entries(LOCATIONS).map(([key, loc]) => ({
          label: loc.name,
          value: key,
          emoji: loc.emoji
        }))
      );

    const durationMenu = new StringSelectMenuBuilder()
      .setCustomId("lumberjack_duration")
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
  }
};
