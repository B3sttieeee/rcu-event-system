const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createGiveaway } = require("../utils/giveawaySystem");

// ===== TIME VALIDATION =====
function isValidTime(time) {
  return /^[0-9]+[smhd]$/.test(time);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Create professional giveaway")

    .addStringOption(opt =>
      opt.setName("prize")
        .setDescription("🎁 Prize")
        .setRequired(true)
    )

    .addIntegerOption(opt =>
      opt.setName("winners")
        .setDescription("🏆 Number of winners (1-20)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(true)
    )

    .addStringOption(opt =>
      opt.setName("time")
        .setDescription("⏳ Duration (10s, 5m, 1h, 1d)")
        .setRequired(true)
    )

    .addAttachmentOption(opt =>
      opt.setName("image")
        .setDescription("🖼 Giveaway image (optional)")
        .setRequired(false)
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {

      await interaction.deferReply({ ephemeral: true });

      const prize = interaction.options.getString("prize").trim();
      const winners = interaction.options.getInteger("winners");
      const time = interaction.options.getString("time").toLowerCase();
      const attachment = interaction.options.getAttachment("image");

      // ===== VALIDATION =====

      if (!isValidTime(time)) {
        return interaction.editReply({
          content: "❌ **Invalid time format**\nUse: `10s`, `5m`, `1h`, `1d`"
        });
      }

      if (prize.length < 3) {
        return interaction.editReply({
          content: "❌ Prize name is too short"
        });
      }

      if (prize.length > 100) {
        return interaction.editReply({
          content: "❌ Prize name is too long (max 100 chars)"
        });
      }

      const image = attachment?.url || null;

      // ===== CREATE =====

      await createGiveaway(interaction, {
        prize,
        winners,
        time,
        image
      });

      await interaction.editReply({
        content: `✅ Giveaway created!\n🎁 **${prize}**\n🏆 Winners: **${winners}**\n⏳ Time: **${time}**`
      });

    } catch (err) {
      console.log("❌ GIVEAWAY ERROR:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ Failed to create giveaway"
        });
      } else {
        await interaction.reply({
          content: "❌ Failed to create giveaway",
          ephemeral: true
        });
      }
    }
  }
};
