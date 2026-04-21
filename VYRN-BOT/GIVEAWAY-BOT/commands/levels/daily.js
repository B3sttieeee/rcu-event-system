const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { 
  isDailyReady, 
  claimDaily 
} = require("../../utils/profileSystem");

const { 
  buildDailyEmbed 
} = require("../../utils/dailySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Sprawdź postęp i odbierz swój daily quest"),

  async execute(interaction) {
    await showDailyPanel(interaction);
  }
};

// ====================== GŁÓWNA FUNKCJA ======================
async function showDailyPanel(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const userId = interaction.user.id;
    const ready = isDailyReady(userId);

    const { embed, components } = buildDailyEmbed(userId, null); // dailySystem sam pobierze dane

    await interaction.editReply({
      embeds: [embed],
      components: components
    });

    // Collector na przycisk "Odbierz daily"
    if (ready) {
      const collector = interaction.channel.createMessageComponentCollector({
        componentType: "Button",
        filter: i => i.customId === "daily_claim" && i.user.id === userId,
        time: 120000 // 2 minuty
      });

      collector.on("collect", async (btnInteraction) => {
        await handleDailyClaim(btnInteraction, interaction.member);
        collector.stop();
      });

      collector.on("end", async () => {
        try {
          const { embed: disabledEmbed } = buildDailyEmbed(userId, null);
          await interaction.editReply({
            embeds: [disabledEmbed],
            components: [] // wyłączamy przycisk
          });
        } catch {}
      });
    }

  } catch (err) {
    console.error("❌ Błąd w /daily:", err);
    await interaction.editReply({
      content: "❌ Wystąpił błąd podczas ładowania daily.",
      embeds: [],
      components: []
    }).catch(() => {});
  }
}

// ====================== CLAIM HANDLER ======================
async function handleDailyClaim(interaction, member) {
  await interaction.deferUpdate();

  try {
    const result = await claimDaily(interaction.user.id, member);

    if (!result.success) {
      return interaction.editReply({
        content: result.message || "❌ Nie udało się odebrać daily.",
        embeds: [],
        components: []
      });
    }

    // Sukces
    const successEmbed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎉 Daily Odebrany Pomyślnie!")
      .setDescription(
        `**Zdobyłeś:** \`${result.xp} XP\`\n` +
        `**Nowy streak:** 🔥 **${result.streak} dni**\n\n` +
        `Wracaj jutro po kolejny daily quest!`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "VYRN • Daily System" })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: []
    });

  } catch (err) {
    console.error("❌ Błąd podczas claim daily:", err);
    await interaction.editReply({
      content: "❌ Wystąpił błąd podczas odbierania daily.",
      embeds: [],
      components: []
    });
  }
}
