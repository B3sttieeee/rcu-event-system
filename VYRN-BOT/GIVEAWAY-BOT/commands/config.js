const { SlashCommandBuilder } = require("discord.js");
const { setConfig } = require("../utils/configSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Ustawienia bota")

    .addSubcommand(cmd =>
      cmd.setName("logs")
        .setDescription("Kanał logów")
        .addChannelOption(opt =>
          opt.setName("channel").setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("welcome")
        .setDescription("Kanał powitalny")
        .addChannelOption(opt =>
          opt.setName("channel").setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("autorole")
        .setDescription("Auto rola")
        .addRoleOption(opt =>
          opt.setName("role").setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("prefix")
        .setDescription("Prefix bota")
        .addStringOption(opt =>
          opt.setName("value").setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("levelchannel")
        .setDescription("Kanał leveli")
        .addChannelOption(opt =>
          opt.setName("channel").setRequired(true)
        )
    )

    .addSubcommand(cmd =>
      cmd.setName("boostrole")
        .setDescription("Rola boost XP")
        .addRoleOption(opt =>
          opt.setName("role").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "logs") {
      const ch = interaction.options.getChannel("channel");
      setConfig(interaction.guild.id, "logChannel", ch.id);
      return interaction.reply({ content: "✅ Log channel ustawiony", ephemeral: true });
    }

    if (sub === "welcome") {
      const ch = interaction.options.getChannel("channel");
      setConfig(interaction.guild.id, "welcomeChannel", ch.id);
      return interaction.reply({ content: "✅ Welcome channel ustawiony", ephemeral: true });
    }

    if (sub === "autorole") {
      const role = interaction.options.getRole("role");
      setConfig(interaction.guild.id, "autoRole", role.id);
      return interaction.reply({ content: "✅ Auto role ustawiona", ephemeral: true });
    }

    if (sub === "prefix") {
      const val = interaction.options.getString("value");
      setConfig(interaction.guild.id, "prefix", val);
      return interaction.reply({ content: "✅ Prefix ustawiony", ephemeral: true });
    }

    if (sub === "levelchannel") {
      const ch = interaction.options.getChannel("channel");
      setConfig(interaction.guild.id, "levelChannel", ch.id);
      return interaction.reply({ content: "✅ Level channel ustawiony", ephemeral: true });
    }

    if (sub === "boostrole") {
      const role = interaction.options.getRole("role");
      setConfig(interaction.guild.id, "boostRole", role.id);
      return interaction.reply({ content: "✅ Boost role ustawiona", ephemeral: true });
    }
  }
};
