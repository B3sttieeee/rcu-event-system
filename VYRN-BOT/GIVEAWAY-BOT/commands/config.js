const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setConfig } = require("../utils/configSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("⚙️ Ustawienia bota")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // AUTOROLE
    .addSubcommand(cmd =>
      cmd.setName("autorole")
        .setDescription("Ustaw auto rolę")
        .addRoleOption(opt =>
          opt.setName("role").setDescription("Rola")
        )
        .addStringOption(opt =>
          opt.setName("id").setDescription("ID roli")
        )
    )

    // LOGS
    .addSubcommand(cmd =>
      cmd.setName("logs")
        .setDescription("Kanał logów")
        .addChannelOption(opt =>
          opt.setName("channel").setDescription("Kanał")
        )
        .addStringOption(opt =>
          opt.setName("id").setDescription("ID kanału")
        )
    )

    // LEVEL
    .addSubcommand(cmd =>
      cmd.setName("levelchannel")
        .setDescription("Kanał level")
        .addChannelOption(opt =>
          opt.setName("channel").setDescription("Kanał")
        )
        .addStringOption(opt =>
          opt.setName("id").setDescription("ID kanału")
        )
    )

    // BOOST
    .addSubcommand(cmd =>
      cmd.setName("boostrole")
        .setDescription("Rola boost")
        .addRoleOption(opt =>
          opt.setName("role").setDescription("Rola")
        )
        .addStringOption(opt =>
          opt.setName("id").setDescription("ID roli")
        )
    ),

  async execute(interaction) {
    try {
      // 🔥 TERAZ defer działa bo configSystem jest async
      await interaction.deferReply({ ephemeral: true });

      const sub = interaction.options.getSubcommand();

      // AUTOROLE
      if (sub === "autorole") {
        let role = interaction.options.getRole("role");
        let id = interaction.options.getString("id");

        if (!role && id) {
          role = interaction.guild.roles.cache.get(id);
        }

        if (!role) {
          return interaction.editReply({
            content: "❌ Podaj rolę lub ID"
          });
        }

        await setConfig(interaction.guild.id, "autoRole", role.id);

        return interaction.editReply({
          content: `✅ Auto role: ${role}`
        });
      }

      // LOGS
      if (sub === "logs") {
        let ch = interaction.options.getChannel("channel");
        let id = interaction.options.getString("id");

        if (!ch && id) {
          ch = interaction.guild.channels.cache.get(id);
        }

        if (!ch) {
          return interaction.editReply({
            content: "❌ Podaj kanał lub ID"
          });
        }

        await setConfig(interaction.guild.id, "logChannel", ch.id);

        return interaction.editReply({
          content: `✅ Log channel: ${ch}`
        });
      }

      // LEVEL
      if (sub === "levelchannel") {
        let ch = interaction.options.getChannel("channel");
        let id = interaction.options.getString("id");

        if (!ch && id) {
          ch = interaction.guild.channels.cache.get(id);
        }

        if (!ch) {
          return interaction.editReply({
            content: "❌ Podaj kanał lub ID"
          });
        }

        await setConfig(interaction.guild.id, "levelChannel", ch.id);

        return interaction.editReply({
          content: `✅ Level channel: ${ch}`
        });
      }

      // BOOST
      if (sub === "boostrole") {
        let role = interaction.options.getRole("role");
        let id = interaction.options.getString("id");

        if (!role && id) {
          role = interaction.guild.roles.cache.get(id);
        }

        if (!role) {
          return interaction.editReply({
            content: "❌ Podaj rolę lub ID"
          });
        }

        await setConfig(interaction.guild.id, "boostRole", role.id);

        return interaction.editReply({
          content: `✅ Boost role: ${role}`
        });
      }

    } catch (err) {
      console.log("❌ CONFIG ERROR:", err);

      try {
        return interaction.editReply({
          content: "❌ Wystąpił błąd"
        });
      } catch {
        return interaction.followUp({
          content: "❌ Wystąpił błąd"
        });
      }
    }
  }
};
