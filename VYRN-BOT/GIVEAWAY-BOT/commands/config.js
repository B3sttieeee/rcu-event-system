const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setConfig } = require("../utils/configSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("⚙️ Ustawienia bota")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(cmd =>
      cmd.setName("logs")
        .setDescription("Ustaw kanał logów")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał logów")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("welcome")
        .setDescription("Ustaw kanał powitalny")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał powitalny")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("autorole")
        .setDescription("Ustaw auto rolę")
        .addRoleOption(opt =>
          opt.setName("role")
            .setDescription("Rola do nadania")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("prefix")
        .setDescription("Ustaw prefix bota")
        .addStringOption(opt =>
          opt.setName("value")
            .setDescription("Nowy prefix")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("levelchannel")
        .setDescription("Kanał level up")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał XP")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("boostrole")
        .setDescription("Rola boost XP")
        .addRoleOption(opt =>
          opt.setName("role")
            .setDescription("Rola boost")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("rules")
        .setDescription("Kanał zasad")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał rules")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("verify")
        .setDescription("Kanał verify")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał verify")
            .setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("tickets")
        .setDescription("Kanał ticketów")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Kanał ticketów")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const sub = interaction.options.getSubcommand();

      if (sub === "logs") {
        const ch = interaction.options.getChannel("channel");
        setConfig(interaction.guild.id, "logChannel", ch.id);
        return interaction.reply({ content: `✅ Log channel: ${ch}`, ephemeral: true });
      }

      if (sub === "welcome") {
        const ch = interaction.options.getChannel("channel");
        setConfig(interaction.guild.id, "welcomeChannel", ch.id);
        return interaction.reply({ content: `✅ Welcome channel: ${ch}`, ephemeral: true });
      }

      if (sub === "autorole") {
        const role = interaction.options.getRole("role");
        setConfig(interaction.guild.id, "autoRole", role.id);
        return interaction.reply({ content: `✅ Auto role: ${role}`, ephemeral: true });
      }

      if (sub === "prefix") {
        const val = interaction.options.getString("value");
        setConfig(interaction.guild.id, "prefix", val);
        return interaction.reply({ content: `✅ Prefix: ${val}`, ephemeral: true });
      }

      if (sub === "levelchannel") {
        const ch = interaction.options.getChannel("channel");
        setConfig(interaction.guild.id, "levelChannel", ch.id);
        return interaction.reply({ content: `✅ Level channel: ${ch}`, ephemeral: true });
      }

      if (sub === "boostrole") {
        const role = interaction.options.getRole("role");
        setConfig(interaction.guild.id, "boostRole", role.id);
        return interaction.reply({ content: `✅ Boost role: ${role}`, ephemeral: true });
      }

      if (sub === "rules") {
        const ch = interaction.options.getChannel("channel");
        setConfig(interaction.guild.id, "rulesChannel", ch.id);
        return interaction.reply({ content: `✅ Rules: ${ch}`, ephemeral: true });
      }

      if (sub === "verify") {
        const ch = interaction.options.getChannel("channel");
        setConfig(interaction.guild.id, "verifyChannel", ch.id);
        return interaction.reply({ content: `✅ Verify: ${ch}`, ephemeral: true });
      }

      if (sub === "tickets") {
        const ch = interaction.options.getChannel("channel");
        setConfig(interaction.guild.id, "ticketChannel", ch.id);
        return interaction.reply({ content: `✅ Tickets: ${ch}`, ephemeral: true });
      }

    } catch (err) {
      console.log("❌ CONFIG ERROR:", err);

      if (interaction.replied || interaction.deferred) {
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
