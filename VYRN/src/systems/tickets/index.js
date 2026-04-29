// src/systems/tickets/index.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  
  ROLES: {
    ADMIN: "1475572271446884535", // Staff [VYRN CLAN]
    KING: "1475570484585168957",  // LEADER / KING
  },
  
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a",
    SUCCESS: "#00FF7F",
    DANGER: "#ff4757"
  },
  
  PANEL_IMAGE: "https://imgur.com/XvQ7eih.png"
};

// ====================== CREATE PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return console.warn("❌ [TICKETS] Panel channel not found. Check the ID!");

  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setTitle("👑 VYRN • RECRUITMENT & SUPPORT")
    .setDescription(
      `Welcome to the official **VYRN** clan support center.\nPlease select the appropriate category from the menu below to open a private channel with our staff.\n\n` +
      `**🏆 VYRN Main Clan**\n` +
      `> Apply to join our competitive leaderboard roster.\n\n` +
      `**🛡️ Staff Application**\n` +
      `> Apply for a Junior Moderator position.\n\n` +
      `**📩 General Support**\n` +
      `> Questions, issues, reports, or business inquiries.\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
    )
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ text: "VYRN Official Ticket System" })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("🎫 Select a category...")
      .addOptions([
        { label: "Apply: VYRN Clan", description: "Submit your application for the main roster", value: "vyrn", emoji: "🏆" },
        { label: "Apply: Staff", description: "Apply to become a Moderator", value: "staff", emoji: "🛡️" },
        { label: "General Support", description: "Ask questions or report an issue", value: "support", emoji: "📩" }
      ])
  );

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = messages?.find(m => m.embeds?.[0]?.title?.includes("RECRUITMENT & SUPPORT"));

  if (existing) {
    await existing.edit({ embeds: [embed], components: [menu] }).catch(console.error);
  } else {
    await channel.send({ embeds: [embed], components: [menu] }).catch(console.error);
  }
}

// ====================== MAIN HANDLER ======================
async function handle(interaction, client) {
  const { customId } = interaction;

  try {
    if (interaction.isStringSelectMenu() && customId === "clan_ticket_select") {
      return await openModal(interaction);
    }
    
    // Button handling (Staff Only)
    if (interaction.isButton()) {
      const hasAccess = interaction.member.roles.cache.has(CONFIG.ROLES.ADMIN) || interaction.member.roles.cache.has(CONFIG.ROLES.KING);
      
      if (!hasAccess && ["claim_ticket", "close_ticket", "rename_ticket", "lock_ticket", "unlock_ticket"].includes(customId)) {
        return interaction.reply({ content: "❌ You do not have permission to use staff controls.", ephemeral: true });
      }

      switch (customId) {
        case "close_ticket": return await closeTicket(interaction);
        case "claim_ticket": return await claimTicket(interaction);
        case "rename_ticket": return await openRenameModal(interaction);
        case "lock_ticket": return await lockTicket(interaction, true);
        case "unlock_ticket": return await lockTicket(interaction, false);
      }
    }

    // Modal handling
    if (interaction.isModalSubmit()) {
      if (customId.startsWith("ticket_modal_")) {
        const type = customId.split("_")[2];
        return await createTicket(interaction, type, client);
      }
      if (customId.startsWith("ticket_rename_modal_")) {
        return await handleRename(interaction);
      }
    }
  } catch (error) {
    console.error("🔥 [TICKETS ERROR]:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ An error occurred in the ticket system. Please check the console.", ephemeral: true }).catch(() => {});
    }
  }
}

// ====================== MODALS ======================
async function openModal(interaction) {
  const type = interaction.values[0];
  
  let modalTitle = "Support Ticket";
  if (type === "vyrn") modalTitle = "Application: VYRN Clan";
  if (type === "staff") modalTitle = "Application: Staff";
  if (type === "support") modalTitle = "General Support";

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(modalTitle);

  if (type === "vyrn") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("nick").setLabel("Roblox Username").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("rebirths").setLabel("Total Rebirths").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("best_pet").setLabel("Best Pet / Multiplier / Rank").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("why").setLabel("Why do you want to join VYRN?").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
  } else if (type === "staff") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("nick").setLabel("Roblox Username").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("age").setLabel("Your Age").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("exp").setLabel("Moderation Experience").setStyle(TextInputStyle.Paragraph).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("why").setLabel("Why should we choose you?").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
  } else {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("topic").setLabel("Subject / Topic").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("desc").setLabel("Describe your issue or question").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
  }
  
  await interaction.showModal(modal);
}

// ====================== CREATE TICKET ======================
async function createTicket(interaction, type, client) {
  try {
    const existing = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id && c.parentId === CONFIG.CATEGORY_ID);
    if (existing) return interaction.reply({ content: `❌ You already have an open ticket: ${existing}`, ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    // Format safe name for Discord channel
    const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    let channelPrefix = "📩-support";
    if (type === "vyrn") channelPrefix = "🏆-vyrn";
    if (type === "staff") channelPrefix = "🛡️-staff";

    const channelName = `${channelPrefix}-${safeName || "user"}`;

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: interaction.user.id,
      parent: CONFIG.CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: CONFIG.ROLES.ADMIN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
        { id: CONFIG.ROLES.KING, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor(CONFIG.THEME.GOLD)
      .setAuthor({ name: `🎫 New Ticket: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setDescription("Please wait patiently for the staff to review your ticket. Make sure you've provided all necessary details.")
      .setTimestamp();

    // Build fields based on type
    if (type === "vyrn") {
      embed.addFields(
        { name: "🎮 Roblox Nickname", value: `\`${interaction.fields.getTextInputValue("nick")}\``, inline: true },
        { name: "🔄 Total Rebirths", value: `\`${interaction.fields.getTextInputValue("rebirths")}\``, inline: true },
        { name: "🐾 Best Pet / Rank", value: `\`${interaction.fields.getTextInputValue("best_pet")}\``, inline: false },
        { name: "📝 Why VYRN?", value: `>>> ${interaction.fields.getTextInputValue("why")}`, inline: false }
      );
    } else if (type === "staff") {
      embed.addFields(
        { name: "🎮 Roblox Nickname", value: `\`${interaction.fields.getTextInputValue("nick")}\``, inline: true },
        { name: "🎂 Age", value: `\`${interaction.fields.getTextInputValue("age")}\``, inline: true },
        { name: "📚 Experience", value: `>>> ${interaction.fields.getTextInputValue("exp")}`, inline: false },
        { name: "📝 Why You?", value: `>>> ${interaction.fields.getTextInputValue("why")}`, inline: false }
      );
    } else {
      embed.addFields(
        { name: "📌 Topic", value: `\`${interaction.fields.getTextInputValue("topic")}\``, inline: false },
        { name: "📄 Description", value: `>>> ${interaction.fields.getTextInputValue("desc")}`, inline: false }
      );
    }

    // Gold Staff Control Panel
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setEmoji("✋").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("rename_ticket").setLabel("Rename").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("lock_ticket").setLabel("Lock").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("unlock_ticket").setLabel("Unlock").setEmoji("🔓").setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ content: `${interaction.user} | <@&${CONFIG.ROLES.ADMIN}> | <@&${CONFIG.ROLES.KING}>`, embeds: [embed], components: [row1, row2] });
    
    if (interaction.message) {
      await interaction.message.edit({ components: interaction.message.components }).catch(() => {}); 
    }
    await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });

  } catch (error) {
    console.error("🔥 [TICKET CREATION ERROR]:", error);
    await interaction.editReply({ content: "❌ An error occurred while creating the channel. Ensure the bot has permissions!" }).catch(() => {});
  }
}

// ====================== STAFF ACTIONS ======================
async function claimTicket(interaction) {
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(CONFIG.THEME.SUCCESS)
    .spliceFields(0, 0, { name: "🛡️ Handled by:", value: `${interaction.user}`, inline: false });

  const rows = interaction.message.components.map(row => {
    const newRow = ActionRowBuilder.from(row);
    newRow.components.forEach(btn => { if (btn.data.custom_id === "claim_ticket") btn.setDisabled(true); });
    return newRow;
  });

  await interaction.update({ embeds: [embed], components: rows });
  await interaction.followUp({ content: `✅ **${interaction.user.username}** has claimed this ticket.` });
}

async function openRenameModal(interaction) {
  const modal = new ModalBuilder().setCustomId(`ticket_rename_modal_${interaction.channel.id}`).setTitle("Rename Ticket");
  const input = new TextInputBuilder().setCustomId("new_name").setLabel("New name (no spaces)").setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleRename(interaction) {
  const newName = interaction.fields.getTextInputValue("new_name").toLowerCase().replace(/[^a-z0-9-]/g, '-');
  await interaction.channel.setName(newName).catch(() => {});
  await interaction.reply({ content: `✅ Channel renamed to: \`${newName}\``, ephemeral: true });
}

async function lockTicket(interaction, isLocking) {
  const targetId = interaction.channel.topic; 
  if (!targetId) return interaction.reply({ content: "❌ Could not find the ticket owner.", ephemeral: true });

  await interaction.channel.permissionOverwrites.edit(targetId, {
    SendMessages: !isLocking
  });

  const state = isLocking ? "🔒 Locked (User cannot type)" : "🔓 Unlocked (User can type)";
  await interaction.reply({ content: `✅ Ticket status: **${state}**` });
}

async function closeTicket(interaction) {
  await interaction.reply({ content: "🔒 Closing ticket... Generating transcript.", ephemeral: true });
  
  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const transcript = messages.filter(m => !m.author.bot).map(m => `[${m.createdAt.toUTCString()}] ${m.author.tag}: ${m.content}`).reverse().join("\n");

  const logChannel = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(CONFIG.THEME.GOLD)
      .setAuthor({ name: "📁 Ticket Closed", iconURL: interaction.guild.iconURL() })
      .addFields(
        { name: "Owner", value: `<@${interaction.channel.topic}>`, inline: true }, 
        { name: "Closed by", value: `${interaction.user}`, inline: true },
        { name: "Channel Name", value: `\`${interaction.channel.name}\``, inline: false }
      )
      .setTimestamp();
      
    await logChannel.send({ 
      embeds: [logEmbed], 
      files: [{ attachment: Buffer.from(transcript || "No user messages."), name: `transcript-${interaction.channel.name}.txt` }] 
    }).catch(console.error);
  }
  
  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
}

function init(client) { 
  console.log("👑 VYRN Ticket System [GOLD EDITION] → Loaded successfully."); 
  
  if (client.isReady()) {
    createTicketPanel(client);
  } else {
    client.once("ready", () => createTicketPanel(client));
  }
}

module.exports = { init, createTicketPanel, handle };
