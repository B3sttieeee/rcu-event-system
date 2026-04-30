// src/commands/top.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../systems/economy");

// --- KONFIGURACJA KOMENDY ---
const CONFIG = {
  TOP_LIMIT: 10,
  FETCH_LIMIT: 100,
  COLOR: "#FFD700", // VYRN Gold
  CURRENCY_EMOJI: "<:CASHH:1491180511308157041>",
  MEDALS: ["🥇", "🥈", "🥉"]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 View the Top 10 Wealthiest Members of VYRN Clan"),

  /**
   * Wykonuje komendę /top
   * @param {import('discord.js').CommandInteraction} interaction 
   */
  async execute(interaction) {
    try {
      // 1. Pobieranie danych
      const allTop = economy.getTopUsers(CONFIG.FETCH_LIMIT); 
      const top10 = allTop.slice(0, CONFIG.TOP_LIMIT);

      // Brak danych
      if (top10.length === 0) {
        return interaction.reply({
          content: "❌ **Economy Empty:** No one has earned any coins yet. Start grinding!",
          ephemeral: true
        });
      }

      // 2. Budowanie listy Top 10
      const leaderboard = top10.map((entry, i) => {
        const positionBadge = CONFIG.MEDALS[i] || `\`#${i + 1}\``;
        const formattedCoins = economy.formatCoins(entry.coins);
        
        // Pogrubienie dla top 3 (podium), normalny tekst dla reszty
        const isPodium = i < 3;
        const line = `${positionBadge} | <@${entry.userId}> ➔ **${formattedCoins}** ${CONFIG.CURRENCY_EMOJI}`;
        
        return isPodium ? `**${line}**` : line;
      }).join("\n\n"); // Podwójny znak nowej linii dla lepszej czytelności

      // 3. Obliczanie statystyk użytkownika
      const userIndex = allTop.findIndex(e => e.userId === interaction.user.id);
      const userPos = userIndex !== -1 ? userIndex + 1 : 0;
      
      let userRankText = "You are not ranked in the top 100 yet. Keep grinding!";
      if (userPos > 0) {
        const userEntry = allTop[userIndex];
        const formattedUserCoins = economy.formatCoins(userEntry.coins);
        userRankText = `> Rank: **#${userPos}**\n> Wealth: **${formattedUserCoins}** ${CONFIG.CURRENCY_EMOJI}`;
      }

      // 4. Obliczanie globalnych statystyk (opcjonalny detal profesjonalny)
      const totalWealth = allTop.reduce((acc, user) => acc + user.coins, 0);
      const formattedTotalWealth = economy.formatCoins(totalWealth);

      // 5. Budowanie Embedu
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR)
        .setAuthor({ 
          name: "VYRN HQ • WEALTH LEADERBOARD", 
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined 
        })
        .setTitle("🏆 TOP 10 RICHEST MEMBERS")
        .setDescription(`Behold the most dedicated and wealthiest grinders in **VYRN CLAN**.\n\n${leaderboard}`)
        .addFields(
          { 
            name: "👤 Your Statistics", 
            value: userRankText, 
            inline: true 
          },
          { 
            name: "🏦 Economy Status", 
            value: `> Tracked Users: **${allTop.length}**\n> Total Wealth: **${formattedTotalWealth}** ${CONFIG.CURRENCY_EMOJI}`, 
            inline: true 
          }
        )
        .setThumbnail(interaction.guild?.iconURL({ dynamic: true }) || undefined)
        .setFooter({ 
          text: "VYRN Clan • Prestige Economy System", 
          iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();

      // 6. Wysłanie odpowiedzi
      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("🔥 [TOP COMMAND ERROR]:", err);
      
      // Obsługa błędów (fallback)
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ **Error:** Failed to load the leaderboard. Try again later.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ **Error:** Failed to load the leaderboard. Try again later.", ephemeral: true });
      }
    }
  }
};
