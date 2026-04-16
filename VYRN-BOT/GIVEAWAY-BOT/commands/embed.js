const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const DEFAULT_COLOR = "#2b2d31";

function createInput({
  id,
  label,
  style,
  value = "",
  placeholder = "",
  required = false,
  maxLength
}) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);

  if (placeholder) input.setPlaceholder(placeholder);
  if (maxLength) input.setMaxLength(maxLength);
  if (value) input.setValue(value);

  return input;
}

function buildStartModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`embedModal_${channelId}`)
    .setTitle("Embed Builder");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "title",
        label: "Tytul",
        style: TextInputStyle.Short,
        placeholder: "Tytul embeda",
        maxLength: 256
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "description",
        label: "Opis",
        style: TextInputStyle.Paragraph,
        placeholder: "Opis embeda",
        maxLength: 4000
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "color",
        label: "Kolor HEX",
        style: TextInputStyle.Short,
        value: DEFAULT_COLOR,
        placeholder: "#2b2d31",
        maxLength: 16
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "author",
        label: "Autor (nazwa | url)",
        style: TextInputStyle.Short,
        placeholder: "Admin | https://...",
        maxLength: 512
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "image",
        label: "Obraz URL",
        style: TextInputStyle.Short,
        placeholder: "https://...",
        maxLength: 2048
      })
    )
  );

  return modal;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Zaawansowany builder embedow")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Kanal docelowy")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "Tej komendy mozna uzyc tylko na serwerze.",
          ephemeral: true
        });
      }

      const targetChannel =
        interaction.options.getChannel("channel") || interaction.channel;

      if (!targetChannel || typeof targetChannel.send !== "function") {
        return interaction.reply({
          content: "Wybrany kanal nie obsluguje wysylania wiadomosci.",
          ephemeral: true
        });
      }

      await interaction.showModal(buildStartModal(targetChannel.id));
    } catch (err) {
      console.log("[/embed ERROR]", err);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "Nie udalo sie otworzyc buildera embeda.",
          ephemeral: true
        }).catch(() => {});
        return;
      }

      await interaction.reply({
        content: "Nie udalo sie otworzyc buildera embeda.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
