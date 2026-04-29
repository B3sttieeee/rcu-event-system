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
    KING: "1475570484585168957",  // TWOJA ROLA (KRÓL)
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
  if (!channel) return console.warn("❌ [TICKETS] Nie znaleziono kanału panelu.");

  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setTitle("👑 VYRN • CENTRUM REKRUTACJI I WSPARCIA")
    .setDescription(
      `Witamy w oficjalnym centrum wsparcia klanu **VYRN**.\nWybierz odpowiednią kategorię z menu poniżej, aby otworzyć prywatny kanał z administracją.\n\n` +
      `**🏆 VYRN Main Clan**\n` +
      `> Aplikacja dla zaawansowanych graczy chcących dołączyć do głównego składu.\n\n` +
      `**🛡️ Staff Support**\n` +
      `> Rekrutacja na stanowisko Junior Moderatora.\n\n` +
      `**📩 Ogólne Wsparcie (Support)**\n` +
      `> Pytania, problemy, zgłoszenia i współprace.\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
    )
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ text: "Oficjalny System Ticketów VYRN" })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("🎫 Wybierz temat zgłoszenia...")
      .addOptions([
        { label: "Aplikacja: VYRN Clan", description: "Złóż podanie do głównego klanu", value: "vyrn", emoji: "🏆" },
        { label: "Aplikacja: Staff", description: "Złóż podanie na Moderatora", value: "staff", emoji: "🛡️" },
        { label: "Wsparcie / Inne", description: "Zadaj pytanie lub zgłoś problem", value: "support", emoji: "📩" }
      ])
  );

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = messages?.find(m => m.embeds?.[0]?.title?.includes("CENTRUM REKRUTACJI"));

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
    
    // Obsługa przycisków
    if (interaction.isButton()) {
      const hasAccess = interaction.member.roles.cache.has(CONFIG.ROLES.ADMIN) || interaction.member.roles.cache.has(CONFIG.ROLES.KING);
      
      // Tylko administracja może klikać te przyciski
      if (!hasAccess && ["claim_ticket", "close_ticket", "rename_ticket", "lock_ticket", "unlock_ticket"].includes(customId)) {
        return interaction.reply({ content: "❌ Nie masz uprawnień, aby używać panelu moderacji.", ephemeral: true });
      }

      switch (customId) {
        case "close_ticket": return await closeTicket(interaction);
        case "claim_ticket": return await claimTicket(interaction);
        case "rename_ticket": return await openRenameModal(interaction);
        case "lock_ticket": return await lockTicket(interaction, true);
        case "unlock_ticket": return await lockTicket(interaction, false);
      }
    }

    // Obsługa formularzy (Modal)
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
  }
}

// ====================== MODALS ======================
async function openModal(interaction) {
  const type = interaction.values[0];
  
  let modalTitle = "Zgłoszenie";
  if (type === "vyrn") modalTitle = "Podanie: VYRN Clan";
  if (type === "staff") modalTitle = "Podanie: Administracja";
  if (type === "support") modalTitle = "Zgłoszenie / Support";

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(modalTitle);

  if (type === "vyrn") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("nick").setLabel("Nazwa w Roblox").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("age").setLabel("Wiek").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("rebirths").setLabel("Ilość Rebirthów / Statystyki").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("why").setLabel("Dlaczego chcesz dołączyć do VYRN?").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
  } else if (type === "staff") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("nick").setLabel("Nazwa w Roblox").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("age").setLabel("Wiek").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("exp").setLabel("Doświadczenie w moderacji").setStyle(TextInputStyle.Paragraph).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("why").setLabel("Dlaczego akurat Ty na Jr. Moderatora?").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
  } else {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("topic").setLabel("Temat zgłoszenia").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("desc").setLabel("Opisz swój problem / sprawę").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
  }
  
  await interaction.showModal(modal);
}

// ====================== CREATE TICKET (KING EDITION) ======================
async function createTicket(interaction, type, client) {
  const existing = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id && c.parentId === CONFIG.CATEGORY_ID);
  if (existing) return interaction.reply({ content: `❌ Masz już otwarty ticket: ${existing}`, ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  // Tagi dla kanału
  let channelPrefix = "📩-support";
  if (type === "vyrn") channelPrefix = "🏆-vyrn";
  if (type === "staff") channelPrefix = "🛡️-staff";

  const channel = await interaction.guild.channels.create({
    name: `${channelPrefix}-${interaction.user.username}`,
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
    .setAuthor({ name: `🎫 Nowe Zgłoszenie: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setDescription("Administracja odpowie najszybciej jak to możliwe. W międzyczasie upewnij się, że podałeś wszystkie szczegóły.")
    .setTimestamp();

  // Budowanie treści na podstawie typu
  if (type === "vyrn") {
    embed.addFields(
      { name: "🎮 Nick Roblox", value: `\`${interaction.fields.getTextInputValue("nick")}\``, inline: true },
      { name: "🎂 Wiek", value: `\`${interaction.fields.getTextInputValue("age")}\``, inline: true },
      { name: "🔄 Statystyki (Rebirths)", value: `\`${interaction.fields.getTextInputValue("rebirths")}\``, inline: false },
      { name: "📝 Dlaczego VYRN?", value: `>>> ${interaction.fields.getTextInputValue("why")}`, inline: false }
    );
  } else if (type === "staff") {
    embed.addFields(
      { name: "🎮 Nick Roblox", value: `\`${interaction.fields.getTextInputValue("nick")}\``, inline: true },
      { name: "🎂 Wiek", value: `\`${interaction.fields.getTextInputValue("age")}\``, inline: true },
      { name: "📚 Doświadczenie", value: `>>> ${interaction.fields.getTextInputValue("exp")}`, inline: false },
      { name: "📝 Dlaczego Ty?", value: `>>> ${interaction.fields.getTextInputValue("why")}`, inline: false }
    );
  } else {
    embed.addFields(
      { name: "📌 Temat", value: `\`${interaction.fields.getTextInputValue("topic")}\``, inline: false },
      { name: "📄 Opis", value: `>>> ${interaction.fields.getTextInputValue("desc")}`, inline: false }
    );
  }

  // Złoty Panel Kontrolny dla Administracji
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Przejmij").setEmoji("✋").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("rename_ticket").setLabel("Zmień Nazwę").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("close_ticket").setLabel("Zamknij Ticket").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("lock_ticket").setLabel("Zablokuj (Lock)").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("unlock_ticket").setLabel("Odblokuj (Unlock)").setEmoji("🔓").setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ content: `${interaction.user} | <@&${CONFIG.ROLES.ADMIN}> | <@&${CONFIG.ROLES.KING}>`, embeds: [embed], components: [row1, row2] });
  
  // Wyczyść menu z wyboru po kliknięciu
  await interaction.message.edit({ components: interaction.message.components }); 
  await interaction.editReply({ content: `✅ Twój ticket został utworzony: ${channel}` });
}

// ====================== STAFF ACTIONS ======================
async function claimTicket(interaction) {
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(CONFIG.THEME.SUCCESS)
    .spliceFields(0, 0, { name: "🛡️ Rozpatruje:", value: `${interaction.user}`, inline: false });

  const rows = interaction.message.components.map(row => {
    const newRow = ActionRowBuilder.from(row);
    newRow.components.forEach(btn => { if (btn.data.custom_id === "claim_ticket") btn.setDisabled(true); });
    return newRow;
  });

  await interaction.update({ embeds: [embed], components: rows });
  await interaction.followUp({ content: `✅ **${interaction.user.username}** przejął to zgłoszenie.` });
}

async function openRenameModal(interaction) {
  const modal = new ModalBuilder().setCustomId(`ticket_rename_modal_${interaction.channel.id}`).setTitle("Zmień nazwę ticketa");
  const input = new TextInputBuilder().setCustomId("new_name").setLabel("Nowa nazwa (bez spacji)").setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleRename(interaction) {
  const newName = interaction.fields.getTextInputValue("new_name").toLowerCase().replace(/\s+/g, '-');
  await interaction.channel.setName(newName).catch(() => {});
  await interaction.reply({ content: `✅ Zmieniono nazwę na: \`${newName}\``, ephemeral: true });
}

async function lockTicket(interaction, isLocking) {
  const targetId = interaction.channel.topic; // ID twórcy ticketa jest w temacie
  if (!targetId) return interaction.reply({ content: "❌ Nie można znaleźć właściciela ticketa.", ephemeral: true });

  // Odbieramy lub przywracamy uprawnienie SendMessages
  await interaction.channel.permissionOverwrites.edit(targetId, {
    SendMessages: !isLocking
  });

  const state = isLocking ? "🔒 Zablokowany (Gracz nie może pisać)" : "🔓 Odblokowany (Gracz może pisać)";
  await interaction.reply({ content: `✅ Status kanału: **${state}**` });
}

async function closeTicket(interaction) {
  await interaction.reply({ content: "🔒 Zamykanie ticketa... Trwa generowanie transkryptu.", ephemeral: true });
  
  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const transcript = messages.filter(m => !m.author.bot).map(m => `[${m.createdAt.toLocaleString("pl-PL")}] ${m.author.tag}: ${m.content}`).reverse().join("\n");

  const logChannel = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(CONFIG.THEME.GOLD)
      .setAuthor({ name: "📁 Ticket Zamknięty", iconURL: interaction.guild.iconURL() })
      .addFields(
        { name: "Właściciel", value: `<@${interaction.channel.topic}>`, inline: true }, 
        { name: "Zamknięty przez", value: `${interaction.user}`, inline: true },
        { name: "Nazwa Kanału", value: `\`${interaction.channel.name}\``, inline: false }
      )
      .setTimestamp();
      
    await logChannel.send({ 
      embeds: [logEmbed], 
      files: [{ attachment: Buffer.from(transcript || "Brak wiadomości od użytkowników."), name: `transcript-${interaction.channel.name}.txt` }] 
    });
  }
  
  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
}

function init(client) { console.log("👑 System Ticketów VYRN [GOLD EDITION] → załadowany pomyślnie"); }

module.exports = { init, createTicketPanel, handle };
