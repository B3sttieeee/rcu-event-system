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

const DEFAULT_COLOR = "#FFD700"; // VYRN Gold as default

// ====================== HELPERS ======================

function createInput({ id, label, style, value = "", placeholder = "", maxLength = 0, required = false }) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);

  if (placeholder) input.setPlaceholder(placeholder);
  if (maxLength > 0) input.setMaxLength(maxLength);

  if (value) {
    input.setValue(String(value).slice(0, maxLength > 0 ? maxLength : 4000));
  }

  return input;
}

/**
 * Builds a more comprehensive modal for VYRN Prestige Embeds
 */
function buildEmbedModal(channelId, messageId = "new", existingEmbed = null) {
  const modal = new ModalBuilder()
    .setCustomId(`embedModal_${channelId}_${messageId}`)
    .setTitle(existingEmbed ? "✏️ Edit Prestige Embed" : "📝 Create New Embed");

  let colorValue = DEFAULT_COLOR;
  if (existingEmbed?.hexColor) {
    colorValue = `#${existingEmbed.hexColor.toString(16).padStart(6, "0")}`;
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "title",
        label: "Title",
        style: TextInputStyle.Short,
        value: existingEmbed?.title || "",
        placeholder: "Enter embed title...",
        maxLength: 256
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "description",
        label: "Description",
        style: TextInputStyle.Paragraph,
        value: existingEmbed?.description || "",
        placeholder: "Enter content (use '.' for empty)",
        maxLength: 4000
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "color",
        label: "HEX Color Code",
        style: TextInputStyle.Short,
        value: colorValue,
        placeholder: "#FFD700",
        maxLength: 7
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "image",
        label: "Main Image URL / GIF",
        style: TextInputStyle.Short,
        value: existingEmbed?.image?.url || "",
        placeholder: "https://vyrn.link/image.png",
        maxLength: 2048
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "footer",
        label: "Footer Text",
        style: TextInputStyle.Short,
        value: existingEmbed?.footer?.text || "",
        placeholder: "VYRN Clan • Official System",
        maxLength: 2048
      })
    )
  );

  return modal;
}

// ====================== VALIDATION ======================

function isValidHex(color) {
  return /^#?[0-9A-Fa-f]{6}$/.test(color.replace("#", ""));
}

function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol.startsWith("http");
  } catch {
    return false;
  }
}

// ====================== MAIN EXPORT ======================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Advanced VYRN Embed Builder with Edit/GIF support")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Target channel for the embed")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
    await interaction.showModal(buildEmbedModal(targetChannel.id));
  },

  // ====================== MODAL HANDLER ======================
  async handleModal(interaction) {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("embedModal_")) return;

    const [, channelId, messageId] = interaction.customId.split("_");
    const channel = interaction.guild.channels.cache.get(channelId) || 
                    await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) return interaction.reply({ content: "❌ Target channel not found.", ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    try {
      const title = interaction.fields.getTextInputValue("title").trim();
      let description = interaction.fields.getTextInputValue("description").trim();
      let colorInput = interaction.fields.getTextInputValue("color").trim();
      const imageUrl = interaction.fields.getTextInputValue("image").trim();
      const footerText = interaction.fields.getTextInputValue("footer").trim();

      if (description === ".") description = "";

      const color = isValidHex(colorInput) 
        ? (colorInput.startsWith("#") ? colorInput : `#${colorInput}`) 
        : DEFAULT_COLOR;

      const embed = new EmbedBuilder().setColor(color).setTimestamp();

      if (title) embed.setTitle(title);
      if (description) embed.setDescription(description);
      if (isValidUrl(imageUrl)) embed.setImage(imageUrl);
      if (footerText) embed.setFooter({ text: footerText });

      let sentMessage;
      if (messageId === "new") {
        // Create new message
        sentMessage = await channel.send({ embeds: [embed] });
      } else {
        // Edit existing message
        const targetMsg = await channel.messages.fetch(messageId).catch(() => null);
        if (!targetMsg) throw new Error("Message not found.");
        sentMessage = await targetMsg.edit({ embeds: [embed] });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`embed_edit_${sentMessage.id}_${channelId}`)
          .setLabel("✏️ Edit Embed")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`embed_delete_${sentMessage.id}_${channelId}`)
          .setLabel("🗑 Delete")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({
        content: `✅ Embed has been ${messageId === "new" ? "sent to" : "updated in"} **#${channel.name}**`,
        components: [row]
      });

    } catch (err) {
      console.error("🔥 [EMBED ERROR]:", err);
      await interaction.editReply({ content: `❌ **Error:** ${err.message || "Failed to process embed."}` });
    }
  },

  // ====================== BUTTON HANDLER ======================
  async handleButton(interaction) {
    const [, action, messageId, channelId] = interaction.customId.split("_");

    const channel = interaction.guild.channels.cache.get(channelId) || 
                    await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) return interaction.reply({ content: "❌ Target channel is no longer accessible.", ephemeral: true });

    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (action === "edit") {
      if (!message?.embeds?.[0]) return interaction.reply({ content: "❌ Embed data not found.", ephemeral: true });
      await interaction.showModal(buildEmbedModal(channelId, messageId, message.embeds[0]));
    }

    if (action === "delete") {
      if (message) await message.delete().catch(() => {});
      await interaction.reply({ content: "🗑️ Embed deleted successfully.", ephemeral: true });
    }
  }
};
