const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const MUTE_ROLE = "1476000458240819301";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute user")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o =>
      o.setName("czas").setDescription("Czas w minutach").setRequired(true))
    .addStringOption(o =>
      o.setName("reason").setDescription("Powód").setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const time = interaction.options.getInteger("czas");
    const reason = interaction.options.getString("reason") || "No reason";

    const member = interaction.guild.members.cache.get(user.id);
    const role = interaction.guild.roles.cache.get(MUTE_ROLE);

    if (!role) return interaction.reply("❌ Brak roli mute");

    await member.roles.add(role);

    // DM
    try {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🔇 You have been muted")
        .setDescription(`⏱ ${time} min\n📌 ${reason}`);

      await user.send({ embeds: [embed] });
    } catch {}

    interaction.reply(`✅ ${user} muted for ${time} min`);

    // AUTO UNMUTE
    setTimeout(async () => {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role).catch(() => {});
      }
    }, time * 60000);
  }
};
