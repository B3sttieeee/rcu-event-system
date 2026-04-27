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

/**
 * Tworzy TextInputBuilder z domyślnymi ustawieniami
 */
function createInput({ id, label, style, value = "", placeholder = "", maxLength, required = false }) {
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

/**
 * Buduje modal do tworzenia/edycji embeda
 */
function buildEmbedModal(channelId, existingEmbed = null) {
  const modal = new ModalBuilder()
    .setCustomId(`embedModal_${channelId}`)
    .setTitle(existingEmbed ? "✏️ Edytuj Embed" : "📝 Tworzenie Embeda");

  // Kolor
  let colorValue = DEFAULT_COLOR;
  if (existingEmbed?.hexColor) {
    colorValue = `#${existingEmbed.hexColor.toString(16).padStart(6, "0")}`;
  }

  // Autor (format: nazwa | iconURL | url)
  let authorValue = "";
  if (existingEmbed?.author) {
    const parts = [];
    if (existingEmbed.author.name) parts.push(existingEmbed.author.name);
    if (existingEmbed.author.iconURL) parts.push(existingEmbed.author.iconURL);
    if (existingEmbed.author.url) parts.push(existingEmbed.author.url);
    authorValue = parts.join(" | ");
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "title",
        label: "Tytuł embeda",
        style: TextInputStyle.Short,
        value: existingEmbed?.title || "",
        placeholder: "Tytuł (max 256 znaków)",
        maxLength: 256
      })
    ),

    new ActionRowBuilder().addComponents(
      createInput({
        id: "title_url",
        label: "URL tytułu (klikalny tytuł)",
        style: TextInputStyle.Short,
        value: existingEmbed?.url || "",
        placeholder: "https://...",
        maxLength: 2048
      })
    ),

    new ActionRowBuilder().addComponents(
      createInput({
        id: "description",
        label: "Opis embeda",
        style: TextInputStyle.Paragraph,
        value: existingEmbed?.description || "",
        placeholder: "Opis ('.' = pusty, max 4000 znaków)",
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
        label: "Autor (nazwa | ikona | url)",
        style: TextInputStyle.Short,
        value: authorValue,
        placeholder: "Nazwa | https://ikona.png | https://link.pl",
        maxLength: 1024
      })
    ),

    new ActionRowBuilder().addComponents(
      createInput({
        id: "image",
        label: "URL dużego obrazu",
        style: TextInputStyle.Short,
        value: existingEmbed?.image?.url || "",
        placeholder: "https://...",
        maxLength: 2048
      })
    ),

    new ActionRowBuilder().addComponents(
      createInput({
        id: "thumbnail",
        label: "URL miniatury (mały obrazek)",
        style: TextInputStyle.Short,
        value: existingEmbed?.thumbnail?.url || "",
        placeholder: "https://...",
        maxLength: 2048
      })
    ),

    new ActionRowBuilder().addComponents(
      createInput({
        id: "footer",
        label: "Stopka (tekst | ikona)",
        style: TextInputStyle.Short,
        value: existingEmbed?.footer 
          ? `${existingEmbed.footer.text || ""} | ${existingEmbed.footer.iconURL || ""}` 
          : "",
        placeholder: "Tekst stopki | https://ikona.png",
        maxLength: 2048
      })
    )
  );

  return modal;
}

/**
 * Sprawdza czy podany kolor jest poprawnym HEX
 */
function isValidHex(color) {
  return /^#?[0-9A-Fa-f]{6}$/.test(color.replace("#", ""));
}

/**
 * Sprawdza czy URL jest poprawny i zaczyna się od http/https
 */
function isValidUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
}

/**
 * Parsuje pole autora w formacie: nazwa | iconURL | url
 */
function parseAuthor(raw) {
  if (!raw?.trim()) return null;

  const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const [name, iconURL, url] = parts;

  if (!name) return null;

  return {
    name,
    iconURL: isValidUrl(iconURL) ? iconURL : undefined,
    url: isValidUrl(url) ? url : undefined
  };
}

/**
 * Parsuje stopkę w formacie: tekst | iconURL
 */
function parseFooter(raw) {
  if (!raw?.trim()) return null;

  const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const [text, iconURL] = parts;

  return {
    text: text || undefined,
    iconURL: isValidUrl(iconURL) ? iconURL : undefined
  };
}

// ====================== KOMENDA ======================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Zaawansowany builder embedów z wsparciem dla linków")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Kanał docelowy (domyślnie bieżący)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ 
        content: "❌ Tej komendy można używać tylko na serwerze.", 
        ephemeral: true 
      });
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
      const title       = interaction.fields.getTextInputValue("title").trim();
      const titleUrl    = interaction.fields.getTextInputValue("title_url").trim();
      let description   = interaction.fields.getTextInputValue("description").trim();
      let colorInput    = interaction.fields.getTextInputValue("color").trim();
      const authorRaw   = interaction.fields.getTextInputValue("author").trim();
      const image       = interaction.fields.getTextInputValue("image").trim();
      const thumbnail   = interaction.fields.getTextInputValue("thumbnail").trim();
      const footerRaw   = interaction.fields.getTextInputValue("footer").trim();

      if (description === ".") description = "";

      // Kolor
      if (colorInput) {
        if (!colorInput.startsWith("#")) colorInput = `#${colorInput}`;
        colorInput = colorInput.slice(0, 7);
      }
      const color = isValidHex(colorInput) ? colorInput : DEFAULT_COLOR;

      const embed = new EmbedBuilder().setColor(color);

      if (title) embed.setTitle(title);
      if (titleUrl && isValidUrl(titleUrl)) embed.setURL(titleUrl);
      if (description) embed.setDescription(description);

      const author = parseAuthor(authorRaw);
      if (author) embed.setAuthor(author);

      if (image && isValidUrl(image)) embed.setImage(image);
      if (thumbnail && isValidUrl(thumbnail)) embed.setThumbnail(thumbnail);

      const footer = parseFooter(footerRaw);
      if (footer) embed.setFooter(footer);

      const sentMessage = await channel.send({ embeds: [embed] });

      // Przyciski edycji i usuwania
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`embed_edit_${sentMessage.id}_${channelId}`)
          .setLabel("✏️ Edytuj")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`embed_delete_${sentMessage.id}_${channelId}`)
          .setLabel("🗑 Usuń")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({
        content: `✅ Embed został pomyślnie wysłany na kanał **#${channel.name}**`,
        components: [row]
      });

    } catch (err) {
      console.error("[EMBED] Modal Error:", err);
      await interaction.editReply({ 
        content: "❌ Wystąpił błąd podczas tworzenia embeda. Sprawdź konsolę." 
      });
    }
  },

  // ====================== OBSŁUGA PRZYCISKÓW ======================
  async handleButton(interaction) {
    const cid = interaction.customId;

    // Edycja embeda
    if (cid.startsWith("embed_edit_")) {
      const [, , messageId, channelId] = cid.split("_");

      const channel = interaction.guild.channels.cache.get(channelId) ||
                      await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message?.embeds[0]) {
        return interaction.reply({ content: "❌ Nie znaleziono embeda do edycji.", ephemeral: true });
      }

      await interaction.showModal(buildEmbedModal(channelId, message.embeds[0]));
      return;
    }

    // Usuwanie embeda
    if (cid.startsWith("embed_delete_")) {
      const [, , messageId, channelId] = cid.split("_"); // teraz mamy też channelId

      const channel = interaction.guild.channels.cache.get(channelId) ||
                      await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);

      if (message) {
        await message.delete().catch(() => {});
        await interaction.reply({ content: "🗑 Embed został pomyślnie usunięty.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Nie udało się znaleźć embeda do usunięcia.", ephemeral: true });
      }
    }
  }
};
