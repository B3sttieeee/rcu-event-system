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
  PermissionFlagsBits,
  ComponentType
} = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302", // Główna rola zarządzająca
  PANEL_IMAGE: "https://media.discordapp.net/attachments/1475992778554216448/1496214765406650489/ezgif.com-animated-gif-maker.gif"
};

// ====================== CREATE PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return console.warn("[TICKETS] ⚠️ Nie znaleziono kanału panelu.");

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎫 Recruitment Center")
    .setDescription(
      `**Welcome to VYRN Clan Recruitment**\n\n` +
      `> • **🔥 VYRN Main Clan**\n` +
      `> Competitive / High-tier players application\n\n` +
      `> • **🛠️ Staff Support**\n` +
      `> Join the moderation & administration team\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Wybierz opcję poniżej, aby otworzyć formularz zgłoszeniowy.`
    )
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ text: "VYRN CLAN • System Rekrutacji" })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("🎫 Wybierz typ zgłoszenia...")
      .addOptions([
        { label: "VYRN Main Clan", description: "Aplikuj do głównego składu", value: "vyrn", emoji: "🔥" },
        { label: "Staff Support", description: "Aplikuj do administracji", value: "staff", emoji: "🛠️" }
      ])
  );

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = messages?.find(m => m.embeds?.[0]?.title === "🎫 Recruitment Center");

  if (existing) {
    await existing.edit({ embeds: [embed], components: [menu] });
  } else {
    await channel.send({ embeds: [embed], components: [menu] });
  }

  console.log("[TICKETS] ✅ Panel został zsynchronizowany.");
}

// ====================== MAIN HANDLER ======================
async function handle(interaction, client) {
  const { customId } = interaction;

  try {
    // 1. Wybór z Menu (Otwieranie Modala)
    if (interaction.isStringSelectMenu() && customId === "clan_ticket_select") {
      return await openModal(interaction);
    }

    // 2. Przycisk: Zamknij Ticket
    if (interaction.isButton() && customId === "close_ticket") {
      return await closeTicket(interaction);
    }

    // 3. Przycisk: Przejmij (Claim) Ticket
    if (interaction.isButton() && customId === "claim_ticket") {
      return await claimTicket(interaction);
    }

    // 4. Przycisk: Zmień nazwę (Rename Tool)
    if (interaction.isButton() && customId === "rename_ticket") {
        return await openRenameModal(interaction);
    }

    // 5. Submit Modala (Tworzenie ticketu)
    if (interaction.isModalSubmit() && customId.startsWith("ticket_modal_")) {
      const type = customId.split("_")[2];
      return await createTicket(interaction, type, client);
    }

    // 6. Submit Modala (Zmiana nazwy kanału)
    if (interaction.isModalSubmit() && customId.startsWith("ticket_rename_modal_")) {
        return await handleRename(interaction);
    }

  } catch (error) {
    console.error("🔥 [TICKETS HANDLER ERROR]:", error);
  }
}

// ====================== STEPS ======================

async function openModal(interaction) {
  const type = interaction.values[0];
  const titles = { vyrn: "VYRN Main Clan Application", staff: "Staff Support Application" };

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(titles[type]);

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("Nick w grze (Roblox)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const why = new TextInputBuilder()
    .setCustomId("why")
    .setLabel("Dlaczego Ty? (Krótkie uzasadnienie)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nick),
    new ActionRowBuilder().addComponents(why)
  );

  await interaction.showModal(modal);
}

async function createTicket(interaction, type, client) {
  const nick = interaction.fields.getTextInputValue("nick");
  const why = interaction.fields.getTextInputValue("why");
  const names = { vyrn: "VYRN Clan", staff: "Staff" };

  // Sprawdź czy użytkownik ma już otwarty kanał (po topicu)
  const existing = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id && c.parentId === CONFIG.CATEGORY_ID);
  if (existing) {
    return interaction.reply({ content: `❌ Masz już otwarte zgłoszenie: ${existing}`, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

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
    .setTitle(`🎫 Nowa Aplikacja: ${names[type]}`)
    .setDescription(
      `**Użytkownik:** ${interaction.user}\n` +
      `**Nick w grze:** \`${nick}\`\n\n` +
      `**Uzasadnienie:**\n\`\`\`${why}\`\`\`\n` +
      `📌 Prosimy oczekiwać na decyzję Staffu. Możesz wysłać dodatkowe screeny/statystyki poniżej.`
    )
    .setFooter({ text: "VYRN Black Edition • Ticket Management" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Przejmij (Claim)").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("rename_ticket").setLabel("Zmień nazwę").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("close_ticket").setLabel("Zamknij").setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `${interaction.user} | <@&${CONFIG.ADMIN_ROLE}>`,
    embeds: [embed],
    components: [row]
  });

  await interaction.editReply({ content: `✅ Zgłoszenie zostało utworzone: ${channel}` });
  await sendLog(client, interaction, type, channel, nick);
}

// ====================== STAFF TOOLS ======================

async function claimTicket(interaction) {
  if (!interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE)) {
    return interaction.reply({ content: "❌ Tylko Staff może przejąć ten ticket.", ephemeral: true });
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor("#2ecc71")
    .addFields({ name: "🛡️ Obsługiwany przez:", value: `${interaction.user}`, inline: false });

  // Wyłącz przycisk Claim
  const rows = interaction.message.components.map(row => {
    const newRow = ActionRowBuilder.from(row);
    newRow.components.forEach(btn => {
      if (btn.data.custom_id === "claim_ticket") btn.setDisabled(true);
    });
    return newRow;
  });

  await interaction.update({ embeds: [embed], components: rows });
  await interaction.followUp({ content: `✅ **${interaction.user.username}** przejął to zgłoszenie i będzie je prowadził.` });
}

async function openRenameModal(interaction) {
    if (!interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE)) {
        return interaction.reply({ content: "❌ Brak uprawnień.", ephemeral: true });
    }

    const modal = new ModalBuilder()
        .setCustomId(`ticket_rename_modal_${interaction.channel.id}`)
        .setTitle("Zmień nazwę kanału");

    const input = new TextInputBuilder()
        .setCustomId("new_name")
        .setLabel("Nowa nazwa (np. zaakceptowany-nick)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
}

async function handleRename(interaction) {
    const newName = interaction.fields.getTextInputValue("new_name").toLowerCase().replace(/\s+/g, '-');
    await interaction.channel.setName(newName);
    await interaction.reply({ content: `✅ Zmieniono nazwę kanału na: \`${newName}\``, ephemeral: true });
}

// ====================== CLOSE & LOGS ======================

async function closeTicket(interaction) {
  await interaction.reply({ content: "🔒 **Zamykanie zgłoszenia...** Kanał zostanie usunięty za 5 sekund.", ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const transcript = messages
    .filter(m => !m.author.bot)
    .map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`)
    .reverse()
    .join("\n");

  const logChannel = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor("#ff4757")
      .setTitle("📁 Ticket Closed & Archived")
      .addFields(
        { name: "Właściciel", value: `<@${interaction.channel.topic}>`, inline: true },
        { name: "Zamknięty przez", value: `${interaction.user}`, inline: true },
        { name: "Nazwa kanału", value: `\`${interaction.channel.name}\``, inline: true }
      )
      .setTimestamp();

    await logChannel.send({
      embeds: [logEmbed],
      files: [{ attachment: Buffer.from(transcript || "Brak wiadomości.", "utf-8"), name: `transcript-${interaction.channel.name}.txt` }]
    });
  }

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

async function sendLog(client, interaction, type, channel, nick) {
  const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;

  const names = { vyrn: "VYRN Clan", staff: "Staff Support" };

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("📩 New Ticket Opened")
    .addFields(
      { name: "Użytkownik", value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
      { name: "Typ", value: names[type], inline: true },
      { name: "Kanał", value: `${channel}`, inline: true },
      { name: "Nick Roblox", value: `\`${nick}\``, inline: false }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

// ====================== INIT ======================
function init(client) {
  console.log("🎟 Ticket System [BLACK EDITION] → załadowany");
  // Wywołaj createTicketPanel(client) w event/ready.js, aby zsynchronizować panel
}

module.exports = {
  init,
  createTicketPanel,
  handle
};
