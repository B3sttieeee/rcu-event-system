const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { claimDaily } = require("../utils/profileSystem");
const { addXP } = require("../utils/levelSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Claim your daily reward"),

  async execute(interaction) {
    const result = claimDaily(interaction.user.id);

    if (result.error) {
      return interaction.reply({
        content: result.msg,
        flags: 64
      });
    }

    // 🔥 DODAJ XP DO LEVELA
    await addXP(interaction.member, result.xp);

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setDescription(
`🎯 **Daily Claimed!**

<a:XP:1488763317857161377> **+${result.xp} XP**
🔥 Streak: **${result.streak}**

<:PEPENOTE:1488765551038959677> *Come back tomorrow to increase streak!*`
      );

    interaction.reply({ embeds: [embed] });
  }
};
