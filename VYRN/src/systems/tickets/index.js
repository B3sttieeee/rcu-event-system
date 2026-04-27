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
  ADMIN_ROLE: "1475998527191519302",
  PANEL_IMAGE: "https://media.discordapp.net/attachments/1475992778554216448/1496214765406650489/ezgif.com-animated-gif-maker.gif"
};

// ====================== CREATE PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return console.warn("[TICKETS] ⚠️ Panel channel not found.");

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎫 Recruitment Center • Centrum Rekrutacji")
    .setDescription(
      `**Welcome to VYRN Clan Recruitment / Witamy w rekrutacji VYRN**\n\n` +
      `> • **🔥 VYRN Main Clan**\n` +
      `> Competitive / High-tier players application.\n` +
      `> Aplikacja dla graczy turniejowych / high-tier.\n\n` +
      `> • **🛠️ Staff Support**\n` +
      `> Join the moderation team as a Junior Moderator.\n` +
      `> Dołącz do administracji jako Junior Moderator.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Select an option / Wybierz opcję:`
    )
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ text: "VYRN CLAN • Recruitment Panel" })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("🎫 Select application type / Wybierz typ...")
      .addOptions([
        { label: "VYRN Main Clan", description: "Recruitment for players", value: "vyrn", emoji: "🔥" },
        { label: "Staff Support", description: "Apply for Junior Moderator", value: "staff", emoji: "🛠️" }
      ])
  );

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = messages?.find(m => m.embeds?.[0]?.title?.includes("Recruitment Center"));

  if (existing) {
    await existing.edit({ embeds: [embed], components: [menu] });
  } else {
    await channel.send({ embeds: [embed], components: [menu] });
  }
}

// ====================== MAIN HANDLER ======================
async function handle(interaction, client) {
  const { customId } = interaction;

  try {
    if (interaction.isStringSelectMenu() && customId === "clan_ticket_select") {
      return await openModal(interaction);
    }

    if (interaction.isButton() && customId === "close_ticket") {
      return await closeTicket(interaction);
    }

    if (interaction.isButton() && customId === "claim_ticket") {
      return await claimTicket(interaction);
    }

    if (interaction.isButton() && customId === "rename_ticket") {
      return await openRenameModal(interaction);
    }

    if (interaction.isModalSubmit() && customId.startsWith("ticket_modal_")) {
      const type = customId.split("_")[2];
      return await createTicket(interaction, type, client);
    }

    if (interaction.isModalSubmit() && customId.startsWith("ticket_rename_modal_")) {
      return await handleRename(interaction);
    }
  } catch (error) {
    console.error("🔥 [TICKETS ERROR]:", error);
  }
}

// ====================== MODALS ======================
async function openModal(interaction) {
  const type = interaction.values[0];
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(type === "vyrn" ? "VYRN Clan Application" : "Staff Application");

  if (type === "vyrn") {
    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Nickname (Roblox)")
      .setPlaceholder("Twój nick w grze...")
      .setStyle(TextInputStyle.Short).setRequired(true);

    const language = new TextInputBuilder()
      .setCustomId("lang")
      .setLabel("Language / Język (Polish / English)")
      .setPlaceholder("PL / EN / Both")
      .setStyle(TextInputStyle.Short).setRequired(true);

    const rebirths = new TextInputBuilder()
      .setCustomId("rebirths")
      .setLabel("How much Rebirth? / Ile masz Rebirth?")
      .setPlaceholder("np. 500 Rebirths")
      .setStyle(TextInputStyle.Short).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nick),
      new ActionRowBuilder().addComponents(language),
      new ActionRowBuilder().addComponents(rebirths)
    );
  } else {
    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Nickname (Roblox)")
      .setStyle(TextInputStyle.Short).setRequired(true);

    const age = new TextInputBuilder()
      .setCustomId("age")
      .setLabel("How old are you? / Ile masz lat?")
      .setStyle(TextInputStyle.Short).setRequired(true);

    const why = new TextInputBuilder()
      .setCustomId("why")
      .setLabel("Why Jr. Moderator? / Dlaczego Ty?")
      .setPlaceholder("Dlaczego chcesz zostać Junior Moderatorem?")
      .setStyle(TextInputStyle.Paragraph).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nick),
      new ActionRowBuilder().addComponents(age),
      new ActionRowBuilder().addComponents(why)
    );
  }

  await interaction.showModal(modal);
}

// ====================== CREATE TICKET ======================
async function createTicket(interaction, type, client) {
  const existing = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id && c.parentId === CONFIG.CATEGORY_ID);
  if (existing) return interaction.reply({ content: `❌ You already have a ticket / Masz już ticket: ${existing}`, ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  const nick = interaction.fields.getTextInputValue("nick");
  
  const channel = await interaction.guild.channels.create({
    name: `🎫-${type}-${interaction.user.username}`,
    type: ChannelType.GuildText,
    topic: interaction.user.id,
    parent: CONFIG.CATEGORY_ID,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
      { id: CONFIG.ADMIN_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }
    ]
  });

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle(`🎫 New Application: ${type === "vyrn" ? "Main Clan" : "Staff Support"}`)
    .setTimestamp();

  if (type === "vyrn") {
    embed.addFields(
      { name: "👤 User", value: `${interaction.user}`, inline: true },
      { name: "🎮 Nickname", value: `\`${nick}\``, inline: true },
      { name: "🌐 Language", value: `\`${interaction.fields.getTextInputValue("lang")}\``, inline: true },
      { name: "🔄 Rebirths", value: `\`${interaction.fields.getTextInputValue("rebirths")}\``, inline: false }
    );
  } else {
    embed.addFields(
      { name: "👤 User", value: `${interaction.user}`, inline: true },
      { name: "🎮 Nickname", value: `\`${nick}\``, inline: true },
      { name: "🎂 Age / Wiek", value: `\`${interaction.fields.getTextInputValue("age")}\``, inline: true },
      { name: "🛠️ Why Junior Moderator?", value: `\`\`\`${interaction.fields.getTextInputValue("why")}\`\`\``, inline: false }
    );
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim / Przejmij").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("rename_ticket").setLabel("Rename / Nazwa").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close / Zamknij").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: `${interaction.user} | <@&${CONFIG.ADMIN_ROLE}>`, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Ticket created / Utworzono: ${channel}` });
  await sendLog(client, interaction, type, channel, nick);
}

// ====================== STAFF ACTIONS ======================
async function claimTicket(interaction) {
  if (!interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE)) return interaction.reply({ content: "❌ No permission / Brak uprawnień.", ephemeral: true });

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor("#2ecc71")
    .addFields({ name: "🛡️ Handled by / Obsługiwany przez:", value: `${interaction.user}`, inline: false });

  const rows = interaction.message.components.map(row => {
    const newRow = ActionRowBuilder.from(row);
    newRow.components.forEach(btn => { if (btn.data.custom_id === "claim_ticket") btn.setDisabled(true); });
    return newRow;
  });

  await interaction.update({ embeds: [embed], components: rows });
  await interaction.followUp({ content: `✅ **${interaction.user.username}** claimed this ticket.` });
}

async function openRenameModal(interaction) {
  if (!interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE)) return interaction.reply({ content: "❌ No permission.", ephemeral: true });
  const modal = new ModalBuilder().setCustomId(`ticket_rename_modal_${interaction.channel.id}`).setTitle("Rename Ticket");
  const input = new TextInputBuilder().setCustomId("new_name").setLabel("New name / Nowa nazwa").setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleRename(interaction) {
  const newName = interaction.fields.getTextInputValue("new_name").toLowerCase().replace(/\s+/g, '-');
  await interaction.channel.setName(newName);
  await interaction.reply({ content: `✅ Name updated to / Nazwa: \`${newName}\``, ephemeral: true });
}

async function closeTicket(interaction) {
  await interaction.reply({ content: "🔒 Closing... / Zamykanie...", ephemeral: true });
  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const transcript = messages.filter(m => !m.author.bot).map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).reverse().join("\n");

  const logChannel = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor("#ff4757").setTitle("📁 Ticket Archived")
      .addFields(
        { name: "Owner", value: `<@${interaction.channel.topic}>`, inline: true },
        { name: "Closed by", value: `${interaction.user}`, inline: true }
      ).setTimestamp();

    await logChannel.send({ embeds: [logEmbed], files: [{ attachment: Buffer.from(transcript || "No messages."), name: `transcript-${interaction.channel.name}.txt` }] });
  }
  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
}

async function sendLog(client, interaction, type, channel, nick) {
  const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a").setTitle("📩 Ticket Log")
    .addFields(
      { name: "User", value: `${interaction.user.tag}`, inline: true },
      { name: "Type", value: type.toUpperCase(), inline: true },
      { name: "Nick Roblox", value: nick }
    ).setTimestamp();
  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

function init(client) { console.log("🎟 Ticket System [Bilingual] → załadowany"); }

module.exports = { init, createTicketPanel, handle };
