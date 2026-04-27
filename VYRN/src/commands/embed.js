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
    colorValue = `#${existingEmbed.hexColor.toString(16).padStart(6, "0")}`;
  }

  // Autor: nazwa | iconURL | url
  let authorValue = "";
  if (existingEmbed?.author) {
    const parts = [];
    if (existingEmbed.author.name) parts.push(existingEmbed.author.name);
    if (existingEmbed.author.iconURL) parts.push(existingEmbed.author.iconURL);
    if (existingEmbed.author.url) parts.push(existingEmbed.author.url);
    authorValue = parts.join(" | ");
  }

  // Footer: tekst | iconURL
  let footerValue = "";
  if (existingEmbed?.footer) {
    const parts = [];
    if (existingEmbed.footer.text) parts.push(existingEmbed.footer.text);
    if (existingEmbed.footer.iconURL) parts.push(existingEmbed.footer.iconURL);
    footerValue = parts.join(" | ");
  }

  modal.addComponents(
    // 1
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
    // 2
    new ActionRowBuilder().addComponents(
      createInput({
        id: "url",
        label: "URL tytułu (klikalny link)",
        style: TextInputStyle.Short,
        value: existingEmbed?.url || "",
        placeholder: "https://...",
        maxLength: 2048
      })
    ),
    // 3
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
    // 4
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
    // 5
    new ActionRowBuilder().addComponents(
      createInput({
        id: "author",
        label: "Autor (nazwa | ikona | url)",
        style: TextInputStyle.Short,
        value: authorValue,
        placeholder: "Nazwa | https://ikona.png | https://link.pl",
        maxLength: 1024
      })
    )
  );

  // Dodatkowe pola (image, thumbnail, footer) dodajemy tylko jeśli edytujemy istniejący embed
  // lub można je dodać w drugiej wersji modala w przyszłości
  if (existingEmbed) {
    // Dla edycji dodajemy dodatkowe informacje w konsoli lub osobny modal (ale na razie zostawiamy w 5 polach)
    // Można później rozbudować o drugi modal
  }

  return modal;
}

function isValidHex(color) {
  return /^#?[0-9A-Fa-f]{6}$/.test(color.replace("#", ""));
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

  const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const [name, iconURL, url] = parts;

  return {
    name: name || undefined,
    iconURL: isValidUrl(iconURL) ? iconURL : undefined,
    url: isValidUrl(url) ? url : undefined
  };
}

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
    .setDescription("Zaawansowany builder embedów z linkami")
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
      return interaction.reply({ 
        content: "❌ Tej komendy można użyć tylko na serwerze.", 
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
      const url         = interaction.fields.getTextInputValue("url").trim();
      let description   = interaction.fields.getTextInputValue("description").trim();
      let colorInput    = interaction.fields.getTextInputValue("color").trim();
      const authorRaw   = interaction.fields.getTextInputValue("author").trim();

      if (description === ".") description = "";

      // Kolor
      if (colorInput) {
        if (!colorInput.startsWith("#")) colorInput = "#" + colorInput;
        colorInput = colorInput.slice(0, 7);
      }
      const color = isValidHex(colorInput) ? colorInput : DEFAULT_COLOR;

      const embed = new EmbedBuilder().setColor(color);

      if (title) embed.setTitle(title);
      if (url && isValidUrl(url)) embed.setURL(url);
      if (description) embed.setDescription(description);

      const author = parseAuthor(authorRaw);
      if (author) embed.setAuthor(author);

      // Na razie image, thumbnail i footer nie są w modalu (limit 5 pól)
      // Można je dodać w przyszłości przez drugi modal lub inne rozwiązanie

      const sentMessage = await channel.send({ embeds: [embed] });

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
        content: "❌ Wystąpił błąd podczas tworzenia embeda." 
      });
    }
  },

  // ====================== OBSŁUGA PRZYCISKÓW ======================
  async handleButton(interaction) {
    const cid = interaction.customId;

    if (cid.startsWith("embed_edit_")) {
      const [, , messageId, channelId] = cid.split("_");

      const channel = interaction.guild.channels.cache.get(channelId) ||
                      await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message?.embeds[0]) {
        return interaction.reply({ content: "❌ Nie znaleziono embeda.", ephemeral: true });
      }

      await interaction.showModal(buildEmbedModal(channelId, message.embeds[0]));
      return;
    }

    if (cid.startsWith("embed_delete_")) {
      const [, , messageId, channelId] = cid.split("_");

      const channel = interaction.guild.channels.cache.get(channelId) ||
                      await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);

      if (message) {
        await message.delete().catch(() => {});
        await interaction.reply({ content: "🗑 Embed został usunięty.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Nie udało się usunąć embeda.", ephemeral: true });
      }
    }
  }
};
