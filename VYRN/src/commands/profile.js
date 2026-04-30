// src/commands/profile.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");
const boostSystem = require("../systems/boost");

// --- KONFIGURACJA PROFILU ---
const CONFIG = {
  COLOR: "#FFD700", // VYRN Gold
  CURRENCY_EMOJI: "<:CASHH:1491180511308157041>",
  BANNER_URL: "https://imgur.com/TwojFajnyBanner.gif", // Możesz wstawić link do gifa/grafiki
  PROGRESS_SIZE: 12, // Wydłużony pasek dla lepszego efektu
  PROGRESS_FULL: "🟧",
  PROGRESS_EMPTY: "⬛",
  TIMEOUT: 60000 // Czas aktywności przycisków (1 minuta)
};

// --- FUNKCJE POMOCNICZE ---
function createProgressBar(percent) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const filledCount = Math.round((safePercent / 100) * CONFIG.PROGRESS_SIZE);
  return `${CONFIG.PROGRESS_FULL.repeat(filledCount)}${CONFIG.PROGRESS_EMPTY.repeat(CONFIG.PROGRESS_SIZE - filledCount)}`;
}

function formatVoiceTime(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return "**0**m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `**${hours}**h **${mins}**m` : `**${mins}**m`;
}

// Główna funkcja budująca interfejs (aby móc go odświeżać)
async function buildProfilePayload(interaction, targetUser) {
  const targetId = targetUser.id;
  // Próba pobrania obiektu member z serwera (do daty dołączenia)
  const member = await interaction.guild.members.fetch(targetId).catch(() => null);

  // Pobieranie danych z systemów
  const voiceMin = activity.getVoiceMinutes(targetId) || 0;
  const levelData = activity.getLevelData(targetId) || { level: 0, xp: 0, nextXP: 100 };
  const coins = economy.getCoins(targetId) || 0;
  const currentBoost = boostSystem?.getCurrentBoost ? boostSystem.getCurrentBoost(targetId) : 1;
  const rank = activity.getRank(levelData.level) || { name: "Unranked", emoji: "🔰", multiplier: 1 };
  
  // Obliczenia
  const nextXP = levelData.nextXP || 100;
  const progress = Math.min(100, Math.floor((levelData.xp / nextXP) * 100));
  const totalMultiplier = (currentBoost * (rank.multiplier || 1)).toFixed(1);

  // Tagi czasu Discorda (wyświetlają się dynamicznie w języku i strefie czasowej użytkownika)
  const joinDate = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "`Unknown`";
  const createDate = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:d>`;

  // Symulacja odznak (tutaj w przyszłości podepniesz system z bazy danych)
  const badges = levelData.level > 10 ? "🌟 🛡️ ⚔️" : "🌱 (New Blood)";

  const embed = new EmbedBuilder()
    .setColor(CONFIG.COLOR)
    .setAuthor({ name: "VYRN CLAN • OFFICIAL DOSSIER", iconURL: interaction.guild?.iconURL({ dynamic: true }) })
    .setTitle(`${rank.emoji} ${targetUser.username}`)
    .setDescription(`**Status:** Verified Agent 🟢\n**Badges:** ${badges}`)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
    .setImage(CONFIG.BANNER_URL) // Opcjonalny duży banner na dole profilu
    .addFields(
      {
        name: "📊 Progression & Rank",
        value: `> **Level:** \`${levelData.level}\` | **Rank:** ${rank.emoji} \`${rank.name}\`\n> **XP:** \`${levelData.xp.toLocaleString()} / ${nextXP.toLocaleString()}\`\n> ${createProgressBar(progress)} **${progress}%**`,
        inline: false
      },
      {
        name: "💼 Assets & Activity",
        value: `> 💰 **Wealth:** **${economy.formatCoins(coins)}** ${CONFIG.CURRENCY_EMOJI}\n> 🎤 **Voice:** **${formatVoiceTime(voiceMin)}**`,
        inline: true
      },
      {
        name: "📈 Multipliers",
        value: `> 🚀 **Boost:** ${currentBoost > 1 ? `\`${currentBoost}x\`` : "`None`"}\n> 🔥 **Total:** **${totalMultiplier}x**`,
        inline: true
      },
      {
        name: "📅 Record Details",
        value: `> **Joined Clan:** ${joinDate}\n> **Account Created:** ${createDate}`,
        inline: false
      }
    )
    .setFooter({ text: `Target ID: ${targetId}`, iconURL: interaction.client.user.displayAvatarURL() })
    .setTimestamp();

  // Przyciski interakcji
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("profile_refresh")
      .setLabel("Refresh Stats")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("profile_leaderboard") // Możesz to obsłużyć w osobnym evencie
      .setLabel("View Leaderboard")
      .setEmoji("🏆")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View an interactive, detailed VYRN Clan dossier")
    .addUserOption(option => 
      option.setName("target")
        .setDescription("The member whose dossier you want to view")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser("target") || interaction.user;
      
      // Budowanie początkowego widoku
      const payload = await buildProfilePayload(interaction, targetUser);
      const message = await interaction.editReply(payload);

      // --- KOLEKTOR PRZYCISKÓW (Odświeżanie na żywo) ---
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: CONFIG.TIMEOUT,
        filter: i => i.user.id === interaction.user.id // Tylko wywołujący może klikać
      });

      collector.on("collect", async (i) => {
        if (i.customId === "profile_refresh") {
          // Generujemy profil na nowo z najnowszymi danymi z bazy
          const newPayload = await buildProfilePayload(interaction, targetUser);
          await i.update(newPayload);
        } else if (i.customId === "profile_leaderboard") {
          // Dummy odpowiedź, jeśli wciśnie drugi przycisk
          await i.reply({ content: "🏆 Hint: Use `/top` to see the full leaderboard!", ephemeral: true });
        }
      });

      collector.on("end", async () => {
        // Po upływie minuty wyłączamy przycisk odświeżania, żeby nie wisiał w pamięci
        const disabledRow = ActionRowBuilder.from(payload.components[0]);
        disabledRow.components.forEach(c => c.setDisabled(true));
        await interaction.editReply({ components: [disabledRow] }).catch(() => {});
      });

    } catch (err) {
      console.error("🔥 [PROFILE COMMAND ERROR]:", err);
      return await interaction.editReply({ 
        content: "❌ **System Failure:** Could not construct the dossier. Contact HQ." 
      });
    }
  }
};
