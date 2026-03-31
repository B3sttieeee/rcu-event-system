const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setConfig } = require("../utils/configSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("⚙️ Ustawienia bota")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(cmd =>
      cmd.setName("autorole")
        .setDescription("Ustaw auto rolę")
        .addRoleOption(opt =>
          opt.setName("role")
            .setDescription("Rola")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName("id")
            .setDescription("ID roli")
            .setRequired(false)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("logs")
        .setDescription("Kanał logów")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName("id")
            .setDescription("ID kanału")
            .setRequired(false)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("levelchannel")
        .setDescription("Kanał level")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName("id")
            .setDescription("ID kanału")
            .setRequired(false)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("boostrole")
        .setDescription("Rola boost")
        .addRoleOption(opt =>
          opt.setName("role")
            .setDescription("Rola")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName("id")
            .setDescription("ID roli")
            .setRequired(false)
        )
    ),

  async execute(interaction) {

    // 🔥 SAFE DEFER (zabezpieczenie)
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    try {
      const sub = interaction.options.getSubcommand();

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

        setConfig(interaction.guild.id, "autoRole", role.id);

        return interaction.editReply({
          content: `✅ Auto role: ${role}`
        });
      }

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

        setConfig(interaction.guild.id, "logChannel", ch.id);

        return interaction.editReply({
          content: `✅ Log channel: ${ch}`
        });
      }

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

        setConfig(interaction.guild.id, "levelChannel", ch.id);

        return interaction.editReply({
          content: `✅ Level channel: ${ch}`
        });
      }

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

        setConfig(interaction.guild.id, "boostRole", role.id);

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
