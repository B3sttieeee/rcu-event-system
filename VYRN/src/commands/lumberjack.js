// src/commands/lumberjack.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const LOCATIONS = {
  "Wood":      { name: "Wood (Spawn/Farm)", emoji: "🌲" },
  "Cactus":    { name: "Cactus (Desert)", emoji: "🌵" },
  "Nuclear":   { name: "Nuclear", emoji: "☢️" },
  "Atlantis":  { name: "Atlantis", emoji: "🌊" },
  "Royal":     { name: "Royal (Kingdom)", emoji: "👑" },
  "Hacker":    { name: "Hacker (City)", emoji: "💻" },
  "Diamond":   { name: "Diamond (Cave)", emoji: "💎" },
  "Lava":      { name: "Lava (Volcano)", emoji: "🌋" },
  "Heaven":    { name: "Heaven", emoji: "☁️" },
  "Magic":     { name: "Magic", emoji: "✨" },
  "Circus":    { name: "Circus", emoji: "🎪" },
  "Jungle":    { name: "Jungle", emoji: "🌴" },
  "Steampunk": { name: "Steampunk", emoji: "⚙️" },
  "Sakura":    { name: "Sakura", emoji: "🌸" }
};

const DURATIONS = [
  { label: "1 Hour Expedition",  value: "60" },
  { label: "3 Hours Expedition", value: "180" },
  { label: "6 Hours Expedition", value: "360" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lumberjack")
    .setDescription("🪓 Deploy your Lumberjack on an expedition"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#FFD700") // VYRN Gold
      .setAuthor({ 
        name: "VYRN HQ • LUMBERJACK HOUSE", 
        iconURL: interaction.guild.iconURL({ dynamic: true }) 
      })
      .setTitle("🌲 EXPEDITION SETUP")
      .setDescription(
        "Configure your Lumberjack's next mission. Select the target area and duration below.\n\n" +
        "**Note:** You will receive a DM notification once the resources are collected."
      )
      .setImage("https://imgur.com/d410WPL.png")
      .setFooter({ text: "Official VYRN System • Roblox Lumberjack" })
      .setTimestamp();

    // Menu lokacji - czyste i czytelne
    const locationMenu = new StringSelectMenuBuilder()
      .setCustomId("lumberjack_location")
      .setPlaceholder("📍 Choose Location...")
      .addOptions(
        Object.entries(LOCATIONS).map(([key, loc]) => ({
          label: loc.name,
          value: key,
          emoji: loc.emoji
        }))
      );

    // Menu czasu
    const durationMenu = new StringSelectMenuBuilder()
      .setCustomId("lumberjack_duration")
      .setPlaceholder("⏳ Choose Duration...")
      .addOptions(
        DURATIONS.map(d => ({
          label: d.label,
          value: d.value,
          emoji: "🕙"
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
