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
const LEADER_ROLE = "1475570484585168957";
const OFFICER_ROLE = "1475998527191519302";
const PANEL_CHANNEL_ID = "1475558248487583805";
const CATEGORY_ID = "1475985874385899530";

// ================= PANEL =================
async function createTicketPanel(client) {
  try {
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!channel) return console.log("❌ Ticket channel not found");

    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setTitle("🎫 VYRN Clan • Recruitment")
      .setDescription(
`📩 **Open a ticket to apply**

━━━━━━━━━━━━━━━━━━

📋 **Requirements**
• Good Team  
• GamePass  
• 🔄 1.5N Rebirth+  
• 🕒 3–8h AFK  

━━━━━━━━━━━━━━━━━━

🚀 Click button below`
      )
      .setImage("https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif")
      .setFooter({ text: "VYRN • Ticket System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("Open Ticket")
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
        content: `❌ You already have a ticket: ${existing}`,
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle("Create Ticket");

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

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase(),
      topic: interaction.user.id,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID || null,

      permissionOverwrites: [
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
          id: LEADER_ROLE,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels
          ]
        },
        {
          id: OFFICER_ROLE,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎫 Ticket Opened")
      .setDescription(
        lang === "en"
          ? `👤 ${interaction.user}
📝 Nick: **${nick}**

📸 Send your stats screenshots`
          : `👤 ${interaction.user}
📝 Nick: **${nick}**

📸 Wyślij screeny statystyk`
      )
      .setThumbnail(interaction.user.displayAvatarURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close")
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

    const member = interaction.member;

    const isAllowed =
      member.roles.cache.has(LEADER_ROLE) ||
      member.roles.cache.has(OFFICER_ROLE);

    if (!isAllowed) {
      return interaction.reply({
        content: "❌ Only Leader / Officer can close ticket",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "Closing...",
      ephemeral: true
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 1500);
  }
}

// ================= EXPORT =================
module.exports = {
  handle,
  createTicketPanel
};
