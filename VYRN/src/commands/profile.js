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

/**
 * Formatuje minuty na czytelny tekst
 * @param {number} totalMinutes 
 */
function formatVoiceTime(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return "**0**m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `**${hours}**h **${mins}**m` : `**${mins}**m`;
}

/**
 * Buduje paczkę danych do wysłania (Grafika + Statystyki)
 */
async function buildProfilePayload(interaction, targetUser) {
  const targetId = targetUser.id;

  // 1. Pobieranie najświeższych danych z systemów
  const levelData = activity.getLevelData(targetId) || { level: 0, xp: 0, nextXP: 100 };
  const coins = economy.getCoins(targetId) || 0;
  const rank = activity.getRank(levelData.level) || { name: "Unranked", multiplier: 1 };
  const voiceMin = activity.getVoiceMinutes(targetId) || 0;
  
  // Obliczanie mnożników
  const currentBoost = boostSystem?.getCurrentBoost ? boostSystem.getCurrentBoost(targetId) : 1;
  const totalMultiplier = (currentBoost * (rank.multiplier || 1)).toFixed(1);

  // 2. Przygotowanie danych dla generatora Canvas
  const stats = {
    level: levelData.level,
    xp: levelData.xp,
    nextXP: levelData.nextXP || 100,
    coins: coins,
    rankName: rank.name
  };

  // 3. Generowanie grafiki (z unikalną nazwą by uniknąć cache Discorda)
  const imageBuffer = await generateProfileCard(targetUser, stats);
  const fileName = `profile_${targetId}_${Date.now()}.png`;
  const attachment = new AttachmentBuilder(imageBuffer, { name: fileName });

  // 4. Konstrukcja Embedu
  const embed = new EmbedBuilder()
    .setColor("#FFD700") // VYRN Gold
    .setAuthor({ 
      name: "VYRN CLAN • DOSSIER", 
      iconURL: interaction.guild?.iconURL({ dynamic: true }) 
    })
    .setDescription(`Official identity card and extended statistics for <@${targetId}>.`)
    .setImage(`attachment://${fileName}`)
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
    .setFooter({ 
      text: "VYRN Clan Systems • Prestige Edition", 
      iconURL: interaction.client.user.displayAvatarURL() 
    })
    .setTimestamp();

  // 5. Przycisk odświeżania
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
    // Generowanie obrazka trwa, informujemy Discorda by czekał
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser("target") || interaction.user;
      
      // Wysłanie pierwszej wersji profilu
      let payload = await buildProfilePayload(interaction, targetUser);
      const message = await interaction.editReply(payload);

      // --- KOLEKTOR INTERAKCJI (1 minuta) ---
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: i => i.user.id === interaction.user.id // Tylko autor komendy może odświeżać
      });

      collector.on("collect", async (i) => {
        if (i.customId === "profile_refresh") {
          try {
            await i.deferUpdate(); // Pokazujemy stan "ładowania" na przycisku
            
            // Generujemy nowy payload z nową grafiką
            const newPayload = await buildProfilePayload(interaction, targetUser);
            await interaction.editReply(newPayload);
          } catch (err) {
            console.error("Failed to refresh profile:", err);
          }
        }
      });

      collector.on("end", async () => {
        // Po wygaśnięciu czasu, wyłączamy przycisk (staje się szary)
        try {
          const disabledRow = ActionRowBuilder.from(message.components[0]);
          disabledRow.components.forEach(c => c.setDisabled(true));
          await interaction.editReply({ components: [disabledRow] });
        } catch (e) {
          // Ignoruj błąd jeśli wiadomość została usunięta
        }
      });

    } catch (err) {
      console.error("🔥 [PROFILE COMMAND ERROR]:", err);
      const errorContent = "❌ **System Failure:** Could not generate the visual profile card. Please try again later.";
      
      if (interaction.deferred) await interaction.editReply({ content: errorContent });
      else await interaction.reply({ content: errorContent, ephemeral: true });
    }
  }
};
