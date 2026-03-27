const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {

    try {

      // =========================
      // 📩 MODAL SUBMIT
      // =========================
      if (interaction.isModalSubmit()) {

        if (!interaction.customId.startsWith('embedModal_')) return;

        const channelId = interaction.customId.split('_')[1];
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
          return interaction.reply({
            content: '❌ Kanał nie istnieje',
            ephemeral: true
          });
        }

        // ===== INPUTY =====
        let title = interaction.fields.getTextInputValue('title') || "";
        let description = interaction.fields.getTextInputValue('description') || "";
        let color = interaction.fields.getTextInputValue('color') || "#2b2d31";
        let authorRaw = interaction.fields.getTextInputValue('author') || "";
        let image = interaction.fields.getTextInputValue('image') || "";

        if (description === ".") description = "";

        // ===== FUNKCJE =====
        const isValidURL = (url) => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        };

        const isHex = /^#?[0-9A-Fa-f]{6}$/;

        // ===== EMBED =====
        const embed = new EmbedBuilder();

        // COLOR SAFE
        if (isHex.test(color)) {
          embed.setColor(color.startsWith("#") ? color : `#${color}`);
        } else {
          embed.setColor("#2b2d31");
        }

        // CONTENT
        if (title.trim()) embed.setTitle(title.trim());
        if (description.trim()) embed.setDescription(description.trim());

        // 👉 jeśli pusty embed
        if (!title.trim() && !description.trim()) {
          embed.setDescription("‎"); // invisible char
        }

        // ===== AUTHOR SAFE =====
        if (authorRaw.includes("|")) {
          const [name, iconURL] = authorRaw.split("|");

          const cleanName = name?.trim();
          const cleanIcon = iconURL?.trim();

          if (cleanName) {
            if (cleanIcon && isValidURL(cleanIcon)) {
              embed.setAuthor({
                name: cleanName,
                iconURL: cleanIcon
              });
            } else {
              embed.setAuthor({
                name: cleanName
              });
            }
          }
        } else if (authorRaw.trim()) {
          embed.setAuthor({
            name: authorRaw.trim()
          });
        }

        // ===== IMAGE SAFE =====
        if (image && isValidURL(image) && image.startsWith("http")) {
          embed.setImage(image.trim());
        }

        // ===== BUTTONY (PREVIEW)
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`sendEmbed_${channelId}`)
            .setLabel('📨 Wyślij')
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(`editEmbed_${channelId}`)
            .setLabel('✏️ Edytuj')
            .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
          content: '👀 Podgląd embeda:',
          embeds: [embed],
          components: [row],
          ephemeral: true
        });
      }

      // =========================
      // 🔘 BUTTONY
      // =========================
      if (interaction.isButton()) {

        // WYŚLIJ
        if (interaction.customId.startsWith('sendEmbed_')) {

          const channelId = interaction.customId.split('_')[1];
          const channel = interaction.guild.channels.cache.get(channelId);

          if (!channel) {
            return interaction.reply({
              content: '❌ Kanał nie istnieje',
              ephemeral: true
            });
          }

          const embed = interaction.message.embeds[0];

          if (!embed) {
            return interaction.reply({
              content: '❌ Brak embeda!',
              ephemeral: true
            });
          }

          await channel.send({ embeds: [embed] });

          return interaction.update({
            content: '✅ Wysłano!',
            components: [],
            embeds: []
          });
        }

        // EDYTUJ
        if (interaction.customId.startsWith('editEmbed_')) {

          const channelId = interaction.customId.split('_')[1];
          const oldEmbed = interaction.message.embeds[0];

          const modal = new ModalBuilder()
            .setCustomId(`embedModal_${channelId}`)
            .setTitle('✏️ Edytuj embed');

          const title = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Tytuł')
            .setStyle(TextInputStyle.Short)
            .setValue(oldEmbed?.title || "");

          const description = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Opis')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(oldEmbed?.description || ".");

          const color = new TextInputBuilder()
            .setCustomId('color')
            .setLabel('Kolor HEX')
            .setStyle(TextInputStyle.Short)
            .setValue(oldEmbed?.hexColor || "#2b2d31");

          const author = new TextInputBuilder()
            .setCustomId('author')
            .setLabel('Autor (nazwa|url)')
            .setStyle(TextInputStyle.Short);

          const image = new TextInputBuilder()
            .setCustomId('image')
            .setLabel('Obraz URL')
            .setStyle(TextInputStyle.Short);

          modal.addComponents(
            new ActionRowBuilder().addComponents(title),
            new ActionRowBuilder().addComponents(description),
            new ActionRowBuilder().addComponents(color),
            new ActionRowBuilder().addComponents(author),
            new ActionRowBuilder().addComponents(image)
          );

          return interaction.showModal(modal);
        }
      }

    } catch (err) {
      console.log("❌ MODALSUBMIT ERROR:", err);

      try {
        await interaction.reply({
          content: `❌ Błąd:\n\`\`\`${err.message}\`\`\``,
          ephemeral: true
        });
      } catch {}
    }
  }
};
