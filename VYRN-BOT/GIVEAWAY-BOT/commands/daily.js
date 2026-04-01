const { SlashCommandBuilder } = require("discord.js");
const { claimDaily } = require("../utils/profileSystem");
const { addXP } = require("../utils/levelSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎁 Claim your daily reward"),

  async execute(interaction) {

    const result = claimDaily(interaction.member);

    if (!result.ok) {

      if (result.reason === "claimed") {
        return interaction.reply({
          content: "❌ Już odebrałeś daily",
          ephemeral: true
        });
      }

      if (result.reason === "not_ready") {
        return interaction.reply({
          content: "❌ Wymagania: 50 msg + 30 min VC",
          ephemeral: true
        });
      }
    }

    // 🔥 NAGRODA
    await addXP(interaction.member, 100);

    return interaction.reply({
      content: "🎉 Daily odebrane! +100 XP"
    });
  }
};
