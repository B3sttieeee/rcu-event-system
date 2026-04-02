const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

// ===== CONFIG =====
const ADMIN_ROLE = "1475998527191519302";
const PANEL_CHANNEL_ID = "1475558248487583805";
const CATEGORY_ID = "1475985874385899530";
const VERIFY_ROLE = "1475998527191519302"; // 🔥 TA ROLA MA NIE WIDZIEĆ

// ================= PANEL =================
async function createTicketPanel(client) {
  try {
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!channel) return console.log("❌ Ticket channel not found");

    const embed = new EmbedBuilder()
      .setColor("#ff6600")
      .setTitle("📌 Clan VYRN • Ticket System")
      .setDescription(
`📩 **Open a ticket to apply for clan**

━━━━━━━━━━━━━━━━━━

📋 **Requirements**
• Good Team  
• Good GamePass  
• 🔄 500 O Rebirth+  
• 🕒 3–8h AFK  

━━━━━━━━━━━━━━━━━━

🚀 Click button below to start`
      )
      .setImage("https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif")
      .setFooter({ text: "VYRN SYSTEM • Tickets" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🔥 Open Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    const messages = await channel.messages.fetch({ limit: 10 });
    const existing = messages.find(m => m.author.id === client.user.id);

    if (existing) {
      await existing.edit({
        embeds: [embed],
        components: [row]
      });
      return;
    }

    await channel.send({
      embeds: [embed],
      components: [row]
    });

  } catch (err) {
    console.log("❌ PANEL ERROR:", err);
  }
}

// ================= HANDLE =================
async function handle(interaction) {

  // ===== OPEN =====
  if (interaction.isButton() && interaction.customId === "open_ticket") {

    const existing = interaction.guild.channels.cache.find(
      c => c.topic === interaction.user.id
    );

    if (existing) {
      return interaction.reply({
        content: `❌ Masz już ticket: ${existing}`,
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle("🎫 Create Ticket");

    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Nickname")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const lang = new TextInputBuilder()
      .setCustomId("lang")
      .setLabel("Language (pl/en)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nick),
      new ActionRowBuilder().addComponents(lang)
    );

    return interaction.showModal(modal);
  }

  // ===== MODAL =====
  if (interaction.isModalSubmit() && interaction.customId === "ticket_modal") {

    const nick = interaction.fields.getTextInputValue("nick");
    const lang = interaction.fields.getTextInputValue("lang").toLowerCase();

    // 🔥 1. CREATE WITHOUT CATEGORY
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      topic: interaction.user.id
    });

    // 🔥 2. HARD PERMISSIONS (NAJWAŻNIEJSZE)
    await channel.permissionOverwrites.set([
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: ADMIN_ROLE,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: VERIFY_ROLE,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ]);

    // 🔥 3. MOVE TO CATEGORY (BEZ DZIEDZICZENIA)
    await channel.setParent(CATEGORY_ID, { lockPermissions: false });

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎫 Ticket Opened")
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
        lang === "en"
          ? `👤 **User:** ${interaction.user}
📝 **Nickname:** ${nick}

📸 Send screenshots of stats, gamepasses and team.`
          : `👤 **Użytkownik:** ${interaction.user}
📝 **Nick:** ${nick}

📸 Wyślij screeny statystyk, gamepassów i teamu.`
      )
      .setFooter({ text: "VYRN Recruitment System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ Ticket created: ${channel}`,
      ephemeral: true
    });
  }

  // ===== CLOSE =====
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    const isAdmin =
      interaction.member.roles.cache.has(ADMIN_ROLE) ||
      interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!isAdmin) {
      return interaction.reply({
        content: "❌ Only admin can close ticket",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "🗑️ Closing ticket...",
      ephemeral: true
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
}

module.exports = {
  handle,
  createTicketPanel
};
