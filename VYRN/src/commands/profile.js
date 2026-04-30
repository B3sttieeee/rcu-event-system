// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");
const boostSystem = require("../systems/boost");
const { generateProfileCard } = require("../systems/cardgenerator"); // Importujemy nasz nowy system

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
    // Defer jest tu kluczowy, bo generowanie obrazka zajmuje chwilę
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser("target") || interaction.user;
      const targetId = targetUser.id;

      // 1. Zbieranie danych z bazy
      const levelData = activity.getLevelData(targetId) || { level: 0, xp: 0, nextXP: 100 };
      const coins = economy.getCoins(targetId) || 0;
      const rank = activity.getRank(levelData.level) || { name: "Unranked" };

      // Pakujemy dane do obiektu, żeby przekazać je do generatora
      const stats = {
        level: levelData.level,
        xp: levelData.xp,
        nextXP: levelData.nextXP || 100,
        coins: coins,
        rankName: rank.name
      };

      // 2. Generowanie obrazka z nowego systemu
      const imageBuffer = await generateProfileCard(targetUser, stats);
      
      // Tworzymy załącznik Discorda
      const attachment = new AttachmentBuilder(imageBuffer, { name: "profile.png" });

      // 3. Budowanie interfejsu Embed
      const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setAuthor({ name: "VYRN CLAN • ID CARD", iconURL: interaction.guild?.iconURL() })
        .setDescription(`Showing official system data for <@${targetId}>.`)
        .setImage("attachment://profile.png") // Wstawiamy wygenerowany obrazek tutaj!
        .setFooter({ text: "VYRN Clan Systems", iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      // 4. Wysłanie odpowiedzi z załącznikiem
      await interaction.editReply({ 
        embeds: [embed], 
        files: [attachment] 
      });

    } catch (err) {
      console.error("🔥 [PROFILE COMMAND ERROR]:", err);
      return await interaction.editReply({ 
        content: "❌ **System Failure:** Could not generate the visual profile card." 
      });
    }
  }
};
