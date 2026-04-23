// src/commands/embed.js
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
  ChannelType
} = require("discord.js");

const DEFAULT_COLOR = "#0a0a0a";

// ====================== POMOCNICZE FUNKCJE ======================
function createInput({ id, label, style, value = "", placeholder = "", maxLength }) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(false);

  if (placeholder) input.setPlaceholder(placeholder);
  if (maxLength) input.setMaxLength(maxLength);
  if (value) input.setValue(value);

  return input;
}

function buildEmbedModal(channelId, existingEmbed = null) {
  const modal = new ModalBuilder()
    .setCustomId(`embedModal_${channelId}`)
    .setTitle(existingEmbed ? "✏️ Edytuj Embed" : "📝 Tworzenie Embeda");

  let colorValue = DEFAULT_COLOR;
  if (existingEmbed?.hexColor) {
    colorValue = `#${existingEmbed.hexColor.toString(16).padStart(6, '0')}`;
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "title",
        label: "Tytuł embeda",
        style: TextInputStyle.Short,
        value: existingEmbed?.title || "",
        placeholder: "Wpisz tytuł...",
        maxLength: 256
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "description",
        label: "Opis embeda",
        style: TextInputStyle.Paragraph,
        value: existingEmbed?.description || "",
        placeholder: "Wpisz opis (lub '.' aby zostawić pusty)",
        maxLength: 4000
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "color",
        label: "Kolor HEX (#rrggbb)",
        style: TextInputStyle.Short,
        value: colorValue,
        placeholder: "#0a0a0a",
        maxLength: 7
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "author",
        label: "Autor (nazwa | URL ikony)",
        style: TextInputStyle.Short,
        value: existingEmbed?.author ? `${existingEmbed.author.name || ""} | ${existingEmbed.author.iconURL || ""}` : "",
        placeholder: "Nazwa | https://...",
        maxLength: 512
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "image",
        label: "URL Obrazu",
        style: TextInputStyle.Short,
        value: existingEmbed?.image?.url || "",
        placeholder: "https://...",
        maxLength: 2048
      })
    )
  );

  return modal;
}

function isValidHex(color) {
  return /^#?[0-9A-Fa-f]{6}$/.test(color);
}

function isValidUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return url.startsWith("http");
  } catch {
    return false;
  }
}

function parseAuthor(raw) {
  if (!raw?.trim()) return null;
  if (!raw.includes("|")) return { name: raw.trim() };

  const [name, iconURL] = raw.split("|").map(s => s.trim());
  if (!name) return null;

  return {
    name,
    iconURL: isValidUrl(iconURL) ? iconURL : undefined
  };
}

// ====================== KOMENDA ======================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Zaawansowany builder embedów")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Kanał docelowy")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: "Tej komendy można użyć tylko na serwerze.", ephemeral: true });
    }

    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
    await interaction.showModal(buildEmbedModal(targetChannel.id));
  },

  // ====================== OBSŁUGA MODALA ======================
  async handleModal(interaction) {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("embedModal_")) return;

    const channelId = interaction.customId.split("_")[1];
    const channel = interaction.guild.channels.cache.get(channelId) ||
                    await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: "❌ Nie znaleziono kanału.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let title = interaction.fields.getTextInputValue("title").trim();
      let description = interaction.fields.getTextInputValue("description").trim();
      let colorInput = interaction.fields.getTextInputValue("color").trim();
      let authorRaw = interaction.fields.getTextInputValue("author").trim();
      let image = interaction.fields.getTextInputValue("image").trim();

      if (description === ".") description = "";

      // Bezpieczna obsługa koloru
      if (colorInput) {
        if (!colorInput.startsWith("#")) colorInput = "#" + colorInput;
        colorInput = colorInput.slice(0, 7);
      }
      const color = isValidHex(colorInput) ? colorInput : DEFAULT_COLOR;

      const embed = new EmbedBuilder().setColor(color);

      if (title) embed.setTitle(title);
      if (description) embed.setDescription(description);

      const author = parseAuthor(authorRaw);
      if (author) embed.setAuthor(author);

      if (image && isValidUrl(image)) embed.setImage(image);

      const sentMessage = await channel.send({ embeds: [embed] });

      // Przyciski do edycji i usuwania
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`embed_edit_${sentMessage.id}_${channelId}`)
          .setLabel("✏️ Edytuj")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`embed_delete_${sentMessage.id}`)
          .setLabel("🗑 Usuń")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({
        content: `✅ Embed został pomyślnie wysłany na kanał **${channel.name}**`,
        components: [row]
      });

    } catch (err) {
      console.error("[EMBED] Modal Error:", err);
      await interaction.editReply({ content: "❌ Wystąpił błąd podczas tworzenia embeda." });
    }
  },

  // ====================== OBSŁUGA PRZYCISKÓW ======================
  async handleButton(interaction) {
    const cid = interaction.customId;

    if (cid.startsWith("embed_edit_")) {
      const [, , messageId, channelId] = cid.split("_");
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message?.embeds[0]) {
        return interaction.reply({ content: "❌ Nie znaleziono embeda.", ephemeral: true });
      }

      await interaction.showModal(buildEmbedModal(channelId, message.embeds[0]));
      return;
    }

    if (cid.startsWith("embed_delete_")) {
      const messageId = cid.split("_")[2];
      const message = await interaction.channel.messages.fetch(messageId).catch(() => null);

      if (message) {
        await message.delete().catch(() => {});
        await interaction.reply({ content: "🗑 Embed został usunięty.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Nie udało się usunąć embeda.", ephemeral: true });
      }
    }
  }
};
