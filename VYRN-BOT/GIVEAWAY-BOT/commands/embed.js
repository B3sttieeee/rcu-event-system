const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ComponentType
} = require("discord.js");

const DEFAULT_COLOR = "#2b2d31";

// ====================== POMOCNICZE FUNKCJE ======================
function createInput({ id, label, style, value = "", placeholder = "", required = false, maxLength }) {
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

function buildEmbedModal(channelId, existingEmbed = null) {
  const modal = new ModalBuilder()
    .setCustomId(`embedModal_${channelId}`)
    .setTitle(existingEmbed ? "Edytuj Embed" : "Tworzenie Embeda");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "title",
        label: "Tytuł",
        style: TextInputStyle.Short,
        value: existingEmbed?.title || "",
        placeholder: "Tytuł embeda",
        maxLength: 256
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "description",
        label: "Opis",
        style: TextInputStyle.Paragraph,
        value: existingEmbed?.description || "",
        placeholder: "Opis embeda (może zawierać markdown)",
        maxLength: 4000
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "color",
        label: "Kolor HEX (#rrggbb)",
        style: TextInputStyle.Short,
        value: existingEmbed?.color ? `#${existingEmbed.color.toString(16).padStart(6, '0')}` : DEFAULT_COLOR,
        placeholder: "#2b2d31",
        maxLength: 7
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "author",
        label: "Autor (nazwa | URL ikony)",
        style: TextInputStyle.Short,
        value: existingEmbed?.author ? `${existingEmbed.author.name || ""} | ${existingEmbed.author.iconURL || ""}` : "",
        placeholder: "Nazwa autora | https://...",
        maxLength: 512
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "image",
        label: "Obraz (URL)",
        style: TextInputStyle.Short,
        value: existingEmbed?.image?.url || "",
        placeholder: "https://example.com/image.png",
        maxLength: 2048
      })
    )
  );

  return modal;
}

function parseAuthorField(value) {
  if (!value) return null;
  const [name, iconURL] = value.split("|").map(s => s.trim());
  if (!name) return null;
  return { name, iconURL: iconURL || null };
}

function isValidHexColor(color) {
  return /^#?[0-9A-Fa-f]{6}$/.test(color);
}

function isValidUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ====================== KOMENDA ======================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Zaawansowany builder embedów")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Kanał docelowy (domyślnie bieżący)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: "Tej komendy można użyć tylko na serwerze.", ephemeral: true });
    }

    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

    if (!targetChannel?.send) {
      return interaction.reply({ content: "Wybrany kanał nie obsługuje wysyłania wiadomości.", ephemeral: true });
    }

    await interaction.showModal(buildEmbedModal(targetChannel.id));
  }
};

// ====================== OBSŁUGA MODALA (w tym samym pliku) ======================
module.exports.handleModal = async function handleEmbedModal(interaction) {
  if (!interaction.isModalSubmit() || !interaction.customId.startsWith("embedModal_")) return;

  const channelId = interaction.customId.split("_")[1];
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);

  if (!channel?.send) {
    return interaction.reply({ content: "Nie mogę znaleźć kanału docelowego.", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const title = interaction.fields.getTextInputValue("title").trim();
    const description = interaction.fields.getTextInputValue("description").trim();
    let color = interaction.fields.getTextInputValue("color").trim();
    const authorStr = interaction.fields.getTextInputValue("author").trim();
    const image = interaction.fields.getTextInputValue("image").trim();

    // Walidacja koloru
    if (color && !color.startsWith("#")) color = "#" + color;
    if (color && !isValidHexColor(color)) {
      return interaction.editReply({ content: "❌ Nieprawidłowy format koloru HEX (np. #ff0000)" });
    }

    const author = parseAuthorField(authorStr);

    const embed = new EmbedBuilder()
      .setColor(color || DEFAULT_COLOR);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (author) embed.setAuthor(author);
    if (image && isValidUrl(image)) embed.setImage(image);

    // Wysyłamy embed
    const sentMessage = await channel.send({ embeds: [embed] });

    // Przyciski do dalszego działania
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`embed_edit_${sentMessage.id}_${channelId}`)
        .setLabel("Edytuj embed")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`embed_resend_${sentMessage.id}_${channelId}`)
        .setLabel("Wyślij ponownie")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`embed_delete_${sentMessage.id}`)
        .setLabel("Usuń")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      content: `✅ Embed został pomyślnie wysłany do ${channel}`,
      components: [row]
    });

  } catch (err) {
    console.error("[EMBED MODAL ERROR]", err);
    await interaction.editReply({
      content: "❌ Wystąpił błąd podczas tworzenia embeda. Spróbuj ponownie."
    }).catch(() => {});
  }
};

// ====================== OBSŁUGA PRZYCISKÓW (edycja / delete) ======================
module.exports.handleButton = async function handleEmbedButton(interaction) {
  const cid = interaction.customId;

  if (cid.startsWith("embed_edit_")) {
    const [, , messageId, channelId] = cid.split("_");

    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel) return interaction.reply({ content: "Nie znaleziono kanału.", ephemeral: true });

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message || message.embeds.length === 0) {
      return interaction.reply({ content: "Nie znaleziono embeda do edycji.", ephemeral: true });
    }

    await interaction.showModal(buildEmbedModal(channelId, message.embeds[0]));
    return;
  }

  if (cid.startsWith("embed_resend_")) {
    // Prosta logika ponownego wysłania (możesz rozwinąć)
    await interaction.reply({ content: "Funkcja ponownego wysłania w przygotowaniu...", ephemeral: true });
    return;
  }

  if (cid.startsWith("embed_delete_")) {
    const messageId = cid.split("_")[2];
    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);

    if (message) {
      await message.delete().catch(() => {});
      await interaction.reply({ content: "Embed został usunięty.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Nie udało się usunąć embeda.", ephemeral: true });
    }
  }
};
