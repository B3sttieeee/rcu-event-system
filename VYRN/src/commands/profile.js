// src/commands/profile.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require("discord.js");

const activity = require("../systems/activity");
const economy = require("../systems/economy");
const boostSystem = require("../systems/boost");
const { generateProfileCard } = require("../systems/cardgenerator"); 

// Funkcja formatująca czas
function formatVoiceTime(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return "**0**m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `**${hours}**h **${mins}**m` : `**${mins}**m`;
}

// Główna funkcja budująca całą wiadomość (Grafika + Embed + Przyciski)
async function buildProfilePayload(interaction, targetUser) {
  const targetId = targetUser.id;

  // 1. Zbieranie danych
  const levelData = activity.getLevelData(targetId) || { level: 0, xp: 0, nextXP: 100 };
  const coins = economy.getCoins(targetId) || 0;
  const rank = activity.getRank(levelData.level) || { name: "Unranked", multiplier: 1 };
  
  const voiceMin = activity.getVoiceMinutes(targetId) || 0;
  const currentBoost = boostSystem?.getCurrentBoost ? boostSystem.getCurrentBoost(targetId) : 1;
  const totalMultiplier = (currentBoost * (rank.multiplier || 1)).toFixed(1);

  // 2. Dane dla generatora obrazka
  const stats = {
    level: levelData.level,
    xp: levelData.xp,
    nextXP: levelData.nextXP || 100,
    coins: coins,
    rankName: rank.name
  };

  // 3. Generowanie grafiki
  const imageBuffer = await generateProfileCard(targetUser, stats);
  const attachment = new AttachmentBuilder(imageBuffer, { name: "profile.png" });

  // 4. Budowanie Embedu (Dodatkowe statystyki pod obrazkiem)
  const embed = new EmbedBuilder()
    .setColor("#FFD700")
    .setAuthor({ name: "VYRN CLAN • DOSSIER", iconURL: interaction.guild?.iconURL() })
    .setDescription(`Official identity card and extended statistics for <@${targetId}>.`)
    .setImage("attachment://profile.png") // Zintegrowana grafika
    .addFields(
      { 
        name: "🎤 Voice Activity", 
        value: `> Total Time: ${formatVoiceTime(voiceMin)}`, 
        inline: true 
      },
      { 
        name: "🚀 Active Multipliers", 
        value: `> Global Rate: **${totalMultiplier}x**`, 
        inline: true 
      }
    )
    .setFooter({ text: "VYRN Clan Systems", iconURL: interaction.client.user.displayAvatarURL() })
    .setTimestamp();

  // 5. Przyciski
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("profile_refresh")
      .setLabel("Refresh Data")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], files: [attachment], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View your or another member's dynamic VYRN profile card")
    .addUserOption(option => 
      option.setName("target")
        .setDescription("The member whose profile you want to view")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Generowanie grafiki zawsze trochę trwa, więc deferReply jest konieczne
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser("target") || interaction.user;
      
      // Wysyłamy początkową wiadomość
      const payload = await buildProfilePayload(interaction, targetUser);
      const message = await interaction.editReply(payload);

      // --- KOLEKTOR PRZYCISKÓW (Odświeżanie na żywo) ---
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000, // Przycisk działa przez 1 minutę
        filter: i => i.user.id === interaction.user.id
      });

      collector.on("collect", async (i) => {
        if (i.customId === "profile_refresh") {
          // Informujemy Discorda, że ładujemy nowe dane
          await i.deferUpdate(); 
          // Budujemy nową kartę z najświeższymi danymi
          const newPayload = await buildProfilePayload(interaction, targetUser);
          await interaction.editReply(newPayload);
        }
      });

      collector.on("end", async () => {
        // Po minucie wyłączamy przycisk, żeby nie klikać go w nieskończoność
        const disabledRow = ActionRowBuilder.from(payload.components[0]);
        disabledRow.components[0].setDisabled(true);
        await interaction.editReply({ components: [disabledRow] }).catch(() => {});
      });

    } catch (err) {
      console.error("🔥 [PROFILE COMMAND ERROR]:", err);
      return await interaction.editReply({ 
        content: "❌ **System Failure:** Could not generate the visual profile card." 
      });
    }
  }
};
