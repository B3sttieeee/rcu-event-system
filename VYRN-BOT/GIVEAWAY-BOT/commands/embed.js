const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("📦 Advanced Embed Builder (Pro)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("Kanał docelowy embeda")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const targetChannel =
        interaction.options.getChannel("channel") || interaction.channel;

      // ====================== SAFE OLD EMBED ======================
      let old = null;

      if (interaction.message?.embeds?.length) {
        old = interaction.message.embeds[0];
      }

      // ====================== CLEAN DATA ======================
      const title = old?.title || "";
      const description = old?.description || "";
      const color = old?.color ? `#${old.hexColor}` : "#2b2d31";
      const image = old?.image?.url || "";

      let author = "";
      if (old?.author) {
        author = old.author.iconURL
          ? `${old.author.name} | ${old.author.iconURL}`
          : old.author.name;
      }

      // ====================== MODAL ======================
      const modal = new ModalBuilder()
        .setCustomId(`embed_builder_${targetChannel.id}`)
        .setTitle("📦 Advanced Embed Builder");

      const components = [
        createInput("title", "Title (opcjonalne)", TextInputStyle.Short, title, false, "Mój embed..."),

        createInput(
          "description",
          "Description",
          TextInputStyle.Paragraph,
          description,
          false,
          "Wpisz treść embeda..."
        ),

        createInput(
          "color",
          "Color HEX (#ff0000)",
          TextInputStyle.Short,
          color,
          false,
          "#2b2d31"
        ),

        createInput(
          "author",
          "Author (name | icon URL)",
          TextInputStyle.Short,
          author,
          false,
          "Admin | https://i.imgur.com/xxx.png"
        ),

        createInput(
          "image",
          "Image URL",
          TextInputStyle.Short,
          image,
          false,
          "https://i.imgur.com/image.png"
        ),
      ];

      modal.addComponents(...components.map(c => new ActionRowBuilder().addComponents(c)));

      await interaction.showModal(modal);

    } catch (err) {
      console.error("❌ /embed error:", err);

      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Nie udało się otworzyć edytora embeda.",
          ephemeral: true
        });
      }
    }
  }
};

// ====================== HELPER ======================
function createInput(id, label, style, value, required, placeholder) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setPlaceholder(placeholder);

  if (value && value.length <= 1000) {
    input.setValue(value);
  }

  return input;
}
