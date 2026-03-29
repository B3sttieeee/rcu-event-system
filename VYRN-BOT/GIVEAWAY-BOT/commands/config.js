const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setConfig } = require("../utils/configSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("⚙️ Ustawienia bota")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ===== AUTOROLE =====
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

    // ===== LOGS =====
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

    // ===== LEVEL =====
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

    // ===== BOOST =====
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
    try {
      const sub = interaction.options.getSubcommand();

      // ===== AUTOROLE =====
      if (sub === "autorole") {
        let role = interaction.options.getRole("role");
        let id = interaction.options.getString("id");

        if (!role && id) {
          role = interaction.guild.roles.cache.get(id);
        }

        if (!role) {
          return interaction.editReply({
            content: "❌ Podaj rolę lub ID",
            ephemeral: true
          });
        }

        setConfig(interaction.guild.id, "autoRole", role.id);

        return interaction.editReply({
          content: `✅ Auto role: ${role}`,
          ephemeral: true
        });
      }

      // ===== LOGS =====
      if (sub === "logs") {
        let ch = interaction.options.getChannel("channel");
        let id = interaction.options.getString("id");

        if (!ch && id) {
          ch = interaction.guild.channels.cache.get(id);
        }

        if (!ch) {
          return interaction.editReply({
            content: "❌ Podaj kanał lub ID",
            ephemeral: true
          });
        }

        setConfig(interaction.guild.id, "logChannel", ch.id);

        return interaction.editReply({
          content: `✅ Log channel: ${ch}`,
          ephemeral: true
        });
      }

      // ===== LEVEL =====
      if (sub === "levelchannel") {
        let ch = interaction.options.getChannel("channel");
        let id = interaction.options.getString("id");

        if (!ch && id) {
          ch = interaction.guild.channels.cache.get(id);
        }

        if (!ch) {
          return interaction.editReply({
            content: "❌ Podaj kanał lub ID",
            ephemeral: true
          });
        }

        setConfig(interaction.guild.id, "levelChannel", ch.id);

        return interaction.editReply({
          content: `✅ Level channel: ${ch}`,
          ephemeral: true
        });
      }

      // ===== BOOST =====
      if (sub === "boostrole") {
        let role = interaction.options.getRole("role");
        let id = interaction.options.getString("id");

        if (!role && id) {
          role = interaction.guild.roles.cache.get(id);
        }

        if (!role) {
          return interaction.editReply({
            content: "❌ Podaj rolę lub ID",
            ephemeral: true
          });
        }

        setConfig(interaction.guild.id, "boostRole", role.id);

        return interaction.editReply({
          content: `✅ Boost role: ${role}`,
          ephemeral: true
        });
      }

    } catch (err) {
      console.log("❌ CONFIG ERROR:", err);

      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({
          content: "❌ Wystąpił błąd",
          ephemeral: true
        });
      } else {
        return interaction.reply({
          content: "❌ Wystąpił błąd",
          ephemeral: true
        });
      }
    }
  }
};
};
